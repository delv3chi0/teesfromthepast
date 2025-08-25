#!/usr/bin/env node
// backend/bin/reconcile-payments.js
// Reconciliation script to compare Stripe charges with local orders

import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class PaymentReconciler {
  constructor() {
    this.config = getConfig();
    this.stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
    this.discrepancies = [];
    this.stats = {
      stripeCharges: 0,
      localOrders: 0,
      matched: 0,
      stripeOnly: 0,
      localOnly: 0,
      amountMismatches: 0
    };
  }

  async connectDatabase() {
    try {
      await mongoose.connect(this.config.MONGO_URI);
      logger.info('Database connected for reconciliation');
    } catch (error) {
      logger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  async fetchStripeCharges(daysBack = 7) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const created = {
      gte: Math.floor((Date.now() - (daysBack * 24 * 60 * 60 * 1000)) / 1000)
    };

    logger.info(`Fetching Stripe charges from last ${daysBack} days`);
    
    const charges = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = {
        limit: 100,
        created,
        expand: ['data.payment_intent']
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await this.stripe.charges.list(params);
      charges.push(...response.data);
      
      hasMore = response.has_more;
      if (hasMore) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    this.stats.stripeCharges = charges.length;
    logger.info(`Fetched ${charges.length} Stripe charges`);
    
    return charges;
  }

  async fetchLocalOrders(daysBack = 7) {
    const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
    
    const orders = await Order.find({
      createdAt: { $gte: cutoffDate },
      paymentStatus: 'Succeeded'
    }).lean();

    this.stats.localOrders = orders.length;
    logger.info(`Fetched ${orders.length} local orders`);
    
    return orders;
  }

  compareAmounts(stripeAmount, orderAmount) {
    // Stripe amounts are in cents, order amounts should be too
    return Math.abs(stripeAmount - orderAmount) < 1; // Allow for 1 cent rounding
  }

  async reconcile(daysBack = 7) {
    console.log(`${colors.blue}🔍 Starting payment reconciliation for last ${daysBack} days...${colors.reset}\n`);

    const [stripeCharges, localOrders] = await Promise.all([
      this.fetchStripeCharges(daysBack),
      this.fetchLocalOrders(daysBack)
    ]);

    // Create lookup maps
    const stripeByPaymentIntent = new Map();
    const ordersByPaymentIntent = new Map();

    // Index Stripe charges by payment intent ID
    for (const charge of stripeCharges) {
      if (charge.payment_intent) {
        const piId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent.id;
        stripeByPaymentIntent.set(piId, charge);
      }
    }

    // Index orders by payment intent ID
    for (const order of localOrders) {
      if (order.paymentIntentId) {
        ordersByPaymentIntent.set(order.paymentIntentId, order);
      }
    }

    // Find matches and discrepancies
    const allPaymentIntentIds = new Set([
      ...stripeByPaymentIntent.keys(),
      ...ordersByPaymentIntent.keys()
    ]);

    for (const piId of allPaymentIntentIds) {
      const stripeCharge = stripeByPaymentIntent.get(piId);
      const localOrder = ordersByPaymentIntent.get(piId);

      if (stripeCharge && localOrder) {
        // Both exist - check for amount mismatches
        this.stats.matched++;
        
        if (!this.compareAmounts(stripeCharge.amount, localOrder.totalAmount)) {
          this.stats.amountMismatches++;
          this.discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            paymentIntentId: piId,
            stripeAmount: stripeCharge.amount,
            orderAmount: localOrder.totalAmount,
            difference: stripeCharge.amount - localOrder.totalAmount,
            stripeChargeId: stripeCharge.id,
            orderId: localOrder._id,
            orderCreated: localOrder.createdAt,
            chargeCreated: new Date(stripeCharge.created * 1000)
          });
        }
      } else if (stripeCharge && !localOrder) {
        // Stripe charge exists but no local order
        this.stats.stripeOnly++;
        this.discrepancies.push({
          type: 'STRIPE_ONLY',
          paymentIntentId: piId,
          stripeAmount: stripeCharge.amount,
          stripeChargeId: stripeCharge.id,
          chargeCreated: new Date(stripeCharge.created * 1000),
          description: stripeCharge.description || 'No description'
        });
      } else if (!stripeCharge && localOrder) {
        // Local order exists but no Stripe charge found
        this.stats.localOnly++;
        this.discrepancies.push({
          type: 'LOCAL_ONLY',
          paymentIntentId: piId,
          orderAmount: localOrder.totalAmount,
          orderId: localOrder._id,
          orderCreated: localOrder.createdAt,
          orderStatus: localOrder.orderStatus
        });
      }
    }
  }

  formatCurrency(amount) {
    return `$${(amount / 100).toFixed(2)}`;
  }

  printSummary() {
    console.log(`${colors.blue}📊 RECONCILIATION SUMMARY${colors.reset}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Stripe charges found: ${colors.yellow}${this.stats.stripeCharges}${colors.reset}`);
    console.log(`Local orders found: ${colors.yellow}${this.stats.localOrders}${colors.reset}`);
    console.log(`Matched transactions: ${colors.green}${this.stats.matched}${colors.reset}`);
    console.log(`Stripe-only charges: ${colors.red}${this.stats.stripeOnly}${colors.reset}`);
    console.log(`Local-only orders: ${colors.red}${this.stats.localOnly}${colors.reset}`);
    console.log(`Amount mismatches: ${colors.red}${this.stats.amountMismatches}${colors.reset}`);
    console.log(`Total discrepancies: ${colors.red}${this.discrepancies.length}${colors.reset}\n`);
  }

  printDiscrepancies() {
    if (this.discrepancies.length === 0) {
      console.log(`${colors.green}✅ No discrepancies found! All payments are reconciled.${colors.reset}\n`);
      return;
    }

    console.log(`${colors.red}⚠️  DISCREPANCIES FOUND${colors.reset}`);
    console.log(`${'='.repeat(50)}\n`);

    const byType = {
      AMOUNT_MISMATCH: [],
      STRIPE_ONLY: [],
      LOCAL_ONLY: []
    };

    for (const discrepancy of this.discrepancies) {
      byType[discrepancy.type].push(discrepancy);
    }

    // Amount mismatches
    if (byType.AMOUNT_MISMATCH.length > 0) {
      console.log(`${colors.yellow}💰 AMOUNT MISMATCHES (${byType.AMOUNT_MISMATCH.length})${colors.reset}`);
      for (const disc of byType.AMOUNT_MISMATCH) {
        console.log(`  Payment Intent: ${disc.paymentIntentId}`);
        console.log(`  Stripe: ${this.formatCurrency(disc.stripeAmount)} | Local: ${this.formatCurrency(disc.orderAmount)}`);
        console.log(`  Difference: ${this.formatCurrency(Math.abs(disc.difference))} ${disc.difference > 0 ? '(Stripe higher)' : '(Local higher)'}`);
        console.log(`  Order ID: ${disc.orderId}`);
        console.log('');
      }
    }

    // Stripe-only charges
    if (byType.STRIPE_ONLY.length > 0) {
      console.log(`${colors.red}💳 STRIPE CHARGES WITHOUT LOCAL ORDERS (${byType.STRIPE_ONLY.length})${colors.reset}`);
      for (const disc of byType.STRIPE_ONLY) {
        console.log(`  Payment Intent: ${disc.paymentIntentId}`);
        console.log(`  Amount: ${this.formatCurrency(disc.stripeAmount)}`);
        console.log(`  Charge ID: ${disc.stripeChargeId}`);
        console.log(`  Created: ${disc.chargeCreated.toISOString()}`);
        console.log(`  Description: ${disc.description}`);
        console.log('');
      }
    }

    // Local-only orders
    if (byType.LOCAL_ONLY.length > 0) {
      console.log(`${colors.red}🛒 LOCAL ORDERS WITHOUT STRIPE CHARGES (${byType.LOCAL_ONLY.length})${colors.reset}`);
      for (const disc of byType.LOCAL_ONLY) {
        console.log(`  Payment Intent: ${disc.paymentIntentId}`);
        console.log(`  Amount: ${this.formatCurrency(disc.orderAmount)}`);
        console.log(`  Order ID: ${disc.orderId}`);
        console.log(`  Created: ${disc.orderCreated.toISOString()}`);
        console.log(`  Status: ${disc.orderStatus}`);
        console.log('');
      }
    }
  }

  async generateReport(outputFile = null) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.stats,
      discrepancies: this.discrepancies
    };

    if (outputFile) {
      const fs = await import('fs');
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
      console.log(`${colors.green}📄 Report saved to: ${outputFile}${colors.reset}`);
    }

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const daysBack = parseInt(args[0]) || 7;
  const outputFile = args[1];

  try {
    const reconciler = new PaymentReconciler();
    await reconciler.connectDatabase();
    await reconciler.reconcile(daysBack);
    
    reconciler.printSummary();
    reconciler.printDiscrepancies();
    
    if (outputFile) {
      await reconciler.generateReport(outputFile);
    }

    await mongoose.disconnect();
    
    // Exit with non-zero code if discrepancies found
    process.exit(reconciler.discrepancies.length > 0 ? 1 : 0);
    
  } catch (error) {
    logger.error('Reconciliation failed', { error: error.message });
    console.error(`${colors.red}❌ Reconciliation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PaymentReconciler };
export default main;