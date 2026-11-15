// Shared types for the meal library and the plan generator.
// The meal library is DRAFT nutrition content written by an AI agent. It must be
// reviewed by the doctor before launch (see docs/MEDICAL_RULES.md).

export type MealSlot = 'breakfast' | 'snack' | 'lunch' | 'dinner';

export type Cuisine =
  | 'south'
  | 'north'
  | 'punjabi'
  | 'gujarati'
  | 'bengali'
  | 'odia'
  | 'maharashtrian'
  | 'rajasthani'
  | 'hyderabadi'
  | 'kerala';

/** Lowest diet level that can eat the meal. A 'veg' meal suits everyone. */
export type Diet = 'veg' | 'egg' | 'nonveg';

/** Things a customer can ask to avoid. A meal lists every one it contains. */
export type AvoidTag = 'onion_garlic' | 'dairy' | 'wheat' | 'mushroom' | 'brinjal' | 'seafood';

export type MealTag = 'anti_inflammatory' | 'high_fibre' | 'thyroid_support' | 'steady_energy';

export interface Ingredient {
  /** Lower-case shopping name, e.g. "ragi flour", "toor dal", "curd". */
  item: string;
  qty: number;
  unit: 'g' | 'ml' | 'pc' | 'tbsp' | 'tsp';
}

export interface Meal {
  /** Unique kebab-case id. */
  id: string;
  name: string;
  /** Slots this meal can fill. Lunch and dinner may share a meal. */
  slots: MealSlot[];
  /** Regional kitchens the dish belongs to, or 'any' for pan-Indian staples. */
  cuisines: (Cuisine | 'any')[];
  diet: Diet;
  /** Approximate calories for the portion described. */
  kcal: number;
  /** Approximate protein in grams for the portion described. */
  protein: number;
  /** Household measures: "2 dosas, 1 katori sambar, 1 tbsp chutney". */
  portion: string;
  contains: AvoidTag[];
  gi: 'low' | 'medium';
  tags: MealTag[];
  /** Main shopping items for one portion. */
  ingredients: Ingredient[];
}
