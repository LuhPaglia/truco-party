import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // engine é puro (sem dependências); IA e UI só enxergam o engine; só o app junta tudo.
          depConstraints: [
            { sourceTag: 'type:engine', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:ai', onlyDependOnLibsWithTags: ['type:engine'] },
            { sourceTag: 'type:monetization', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:engine'] },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:engine', 'type:ai', 'type:ui', 'type:monetization'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
