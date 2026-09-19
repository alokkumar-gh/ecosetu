/**
 * LoginCarousel — Re-export wrapper for the new ECOSETU Premium Fullscreen Carousel
 */

import React from 'react';
import { EcoCarousel, EcoCarouselProps } from './carousel';

export const LoginCarousel: React.FC<EcoCarouselProps> = (props) => {
  return <EcoCarousel {...props} />;
};

export default LoginCarousel;
