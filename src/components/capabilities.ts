import capabilities from '../data/capabilities.json';

export type Capabilities = typeof capabilities;
export type CostClass = Capabilities['layers'][number]['cost'];

export const costLabels: Record<CostClass, string> = {
  free: 'Free',
  provider_dependent: 'Depends on provider',
  plugin_defined: 'Defined by the plugin',
};

// Colour tier per cost class; the tier names are the CSS classes in custom.css.
export const costTiers: Record<CostClass, 'free' | 'cheap'> = {
  free: 'free',
  provider_dependent: 'cheap',
  plugin_defined: 'cheap',
};

// The layer with this cost class is the plugin row, not an evaluated layer.
export const isPlugin = (layer: Capabilities['layers'][number]): boolean =>
  layer.cost === 'plugin_defined';

export { capabilities };
