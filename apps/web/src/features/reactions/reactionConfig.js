import { Heart, Lightbulb, Zap } from 'lucide-react';
import { REACTION_TYPES } from '@flash/shared';

const CONFIG = {
  like: {
    label: 'Like',
    icon: Heart,
    activeText: 'text-danger',
    activeSurface: 'bg-danger-soft/40 border-danger/30',
  },
  inspire: {
    label: 'Inspire',
    icon: Lightbulb,
    activeText: 'text-inspire',
    activeSurface: 'bg-inspire-soft/40 border-inspire/30',
  },
  wow: {
    label: 'Wow',
    icon: Zap,
    activeText: 'text-primary',
    activeSurface: 'bg-primary-soft/60 border-primary/40',
  },
};

/** Reaction display settings, in the order defined by the shared rules. */
export const REACTIONS = REACTION_TYPES.map((type) => ({ type, ...CONFIG[type] }));

/** @param {string} type */
export const reactionConfig = (type) => CONFIG[type];
