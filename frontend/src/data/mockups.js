// frontend/src/data/mockups.js
// Central map of Cloudinary mockups for quick lookup by product slug -> color -> view.
// Views: front | back | left | right
// Colors are normalized to lowercase with hyphens (e.g., "brown-savana", "tropical-blue").

const MOCKUPS = {
  // provide both slug styles just in case
  "classic-tee": {
    "black": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973573/mockups/classic-tee/tee-black/mockups/classic-tee/tee-black/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973575/mockups/classic-tee/tee-black/mockups/classic-tee/tee-black/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973577/mockups/classic-tee/tee-black/mockups/classic-tee/tee-black/left.png",
      // right: (upload failed in your log – omitted so code can fall back)
      
      // TODO: Replace with actual black mockup URLs when available
      // Placeholder black mockup - update these URLs with real black t-shirt mockups
      // Expected paths: mockups/classic-tee/tee-black/front.png, etc.
    },
    "brown-savana": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973579/mockups/classic-tee/tee-brown-savana/mockups/classic-tee/tee-brown-savana/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973581/mockups/classic-tee/tee-brown-savana/mockups/classic-tee/tee-brown-savana/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973583/mockups/classic-tee/tee-brown-savana/mockups/classic-tee/tee-brown-savana/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973585/mockups/classic-tee/tee-brown-savana/mockups/classic-tee/tee-brown-savana/right.png",
    },
    "charcoal": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973586/mockups/classic-tee/tee-charcoal/mockups/classic-tee/tee-charcoal/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973588/mockups/classic-tee/tee-charcoal/mockups/classic-tee/tee-charcoal/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973590/mockups/classic-tee/tee-charcoal/mockups/classic-tee/tee-charcoal/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973591/mockups/classic-tee/tee-charcoal/mockups/classic-tee/tee-charcoal/right.png",
    },
    "lime": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973593/mockups/classic-tee/tee-lime/mockups/classic-tee/tee-lime/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973595/mockups/classic-tee/tee-lime/mockups/classic-tee/tee-lime/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973597/mockups/classic-tee/tee-lime/mockups/classic-tee/tee-lime/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973598/mockups/classic-tee/tee-lime/mockups/classic-tee/tee-lime/right.png",
    },
    "maroon": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973601/mockups/classic-tee/tee-maroon/mockups/classic-tee/tee-maroon/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973602/mockups/classic-tee/tee-maroon/mockups/classic-tee/tee-maroon/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973605/mockups/classic-tee/tee-maroon/mockups/classic-tee/tee-maroon/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973606/mockups/classic-tee/tee-maroon/mockups/classic-tee/tee-maroon/right.png",
    },
    "military-green": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973608/mockups/classic-tee/tee-military-green/mockups/classic-tee/tee-military-green/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973610/mockups/classic-tee/tee-military-green/mockups/classic-tee/tee-military-green/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973612/mockups/classic-tee/tee-military-green/mockups/classic-tee/tee-military-green/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973614/mockups/classic-tee/tee-military-green/mockups/classic-tee/tee-military-green/right.png",
    },
    "orange": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973616/mockups/classic-tee/tee-orange/mockups/classic-tee/tee-orange/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973620/mockups/classic-tee/tee-orange/mockups/classic-tee/tee-orange/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973622/mockups/classic-tee/tee-orange/mockups/classic-tee/tee-orange/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973625/mockups/classic-tee/tee-orange/mockups/classic-tee/tee-orange/right.png",
    },
    "purple": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973627/mockups/classic-tee/tee-purple/mockups/classic-tee/tee-purple/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973630/mockups/classic-tee/tee-purple/mockups/classic-tee/tee-purple/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973632/mockups/classic-tee/tee-purple/mockups/classic-tee/tee-purple/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973633/mockups/classic-tee/tee-purple/mockups/classic-tee/tee-purple/right.png",
    },
    "red": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973635/mockups/classic-tee/tee-red/mockups/classic-tee/tee-red/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973637/mockups/classic-tee/tee-red/mockups/classic-tee/tee-red/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973639/mockups/classic-tee/tee-red/mockups/classic-tee/tee-red/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973640/mockups/classic-tee/tee-red/mockups/classic-tee/tee-red/right.png",
    },
    "royal": {
      // front: (upload failed in your log – omitted so code can fall back)
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973644/mockups/classic-tee/tee-royal/mockups/classic-tee/tee-royal/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973646/mockups/classic-tee/tee-royal/mockups/classic-tee/tee-royal/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973648/mockups/classic-tee/tee-royal/mockups/classic-tee/tee-royal/right.png",
    },
    "tropical-blue": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973651/mockups/classic-tee/tee-tropical-blue/mockups/classic-tee/tee-tropical-blue/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973652/mockups/classic-tee/tee-tropical-blue/mockups/classic-tee/tee-tropical-blue/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973654/mockups/classic-tee/tee-tropical-blue/mockups/classic-tee/tee-tropical-blue/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973656/mockups/classic-tee/tee-tropical-blue/mockups/classic-tee/tee-tropical-blue/right.png",
    },
    "white": {
      front: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973657/mockups/classic-tee/tee-white/mockups/classic-tee/tee-white/front.png",
      back:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973659/mockups/classic-tee/tee-white/mockups/classic-tee/tee-white/back.png",
      left:  "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973661/mockups/classic-tee/tee-white/mockups/classic-tee/tee-white/left.png",
      right: "https://res.cloudinary.com/dqvsdvjis/image/upload/v1754973663/mockups/classic-tee/tee-white/mockups/classic-tee/tee-white/right.png",
    },
  },

  // same mapping under alternate slug just in case routes use spaces
  "classic tee": null, // will be filled right below
};

// Duplicate the same mapping under "classic tee" alias:
MOCKUPS["classic tee"] = MOCKUPS["classic-tee"];

// Export both a default and a named (so any import style works)
export default MOCKUPS;
export { MOCKUPS };
