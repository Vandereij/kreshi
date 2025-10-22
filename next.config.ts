// next.config.mjs

import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config: Configuration, _options): Configuration => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      type: 'asset/source',
    });

    return config;
  },
  
  // Add Turbopack configuration
  experimental: {
    turbo: {
      rules: {
        '*.glsl': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.vs': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.fs': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.vert': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.frag': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;