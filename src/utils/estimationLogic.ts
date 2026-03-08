export interface EstimationParams {
  height: number;
  diameter: number;
  proximity: 'clear' | 'near-house' | 'power-lines' | 'fence';
  condition: 'healthy' | 'leaning' | 'dead-decaying';
  access: 'truck' | 'gate' | 'manual-climb';
  baseRate: number;
  heightRate?: number;
  diameterRate?: number;
  hazardMultiplier?: number;
}

export interface EstimateResult {
  min: number;
  max: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export function calculateEstimate(params: EstimationParams): EstimateResult {
  const { 
    height, diameter, proximity, condition, access, 
    baseRate, heightRate = 10, diameterRate = 5, hazardMultiplier = 1.5 
  } = params;

  // Base price calculation
  // Formula: Base + (Height * HeightRate) + (Diameter * DiameterRate)
  let price = baseRate + (height * heightRate) + (diameter * diameterRate);

  // Proximity Multipliers
  const proximityMultipliers = {
    'clear': 1.0,
    'near-house': hazardMultiplier,
    'power-lines': hazardMultiplier * 1.3,
    'fence': 1.2,
  };
  price *= proximityMultipliers[proximity];

  // Condition Multipliers
  const conditionMultipliers = {
    'healthy': 1.0,
    'leaning': 1.2,
    'dead-decaying': 1.4, // Brittle wood is dangerous
  };
  price *= conditionMultipliers[condition];

  // Access Multipliers
  const accessMultipliers = {
    'truck': 1.0,
    'gate': 1.2,
    'manual-climb': 1.6, // Significant labor increase
  };
  price *= accessMultipliers[access];

  // Determine Risk Level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (proximity === 'power-lines' || condition === 'dead-decaying') {
    riskLevel = 'high';
  } else if (proximity === 'near-house' || access === 'manual-climb') {
    riskLevel = 'medium';
  }

  // Return a range to manage expectations
  return {
    min: Math.round(price * 0.9),
    max: Math.round(price * 1.2),
    riskLevel,
  };
}
