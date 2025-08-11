import Design from "../models/Design.js";

export async function listMyDesigns(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id || req.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const page  = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "24", 10)));
    const skip  = (page - 1) * limit;

    const query = Design.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("_id prompt publicUrl thumbUrl createdAt")
      .lean();

    if (typeof query.allowDiskUse === "function") query.allowDiskUse(true);

    const items = await query.exec();
    res.json({ items, page, hasMore: items.length === limit });
  } catch (err) {
    next(err);
  }
}
