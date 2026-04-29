import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    layout: 'padded',
    options: {
      storySort: {
        order: ['Foundation', ['Tokens', 'Typography', 'Colors'], 'Primitives', 'Shell', 'Screens'],
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        Light: 'light',
        Dark: 'dark',
      },
      defaultTheme: 'Light',
      attributeName: 'data-theme',
    }),
    withThemeByDataAttribute({
      themes: {
        Blue: 'blue',
        Indigo: 'indigo',
        Violet: 'violet',
        Teal: 'teal',
        Amber: 'amber',
        Rose: 'rose',
      },
      defaultTheme: 'Blue',
      attributeName: 'data-accent',
    }),
    Story => (
      <div className="bg-bg text-fg min-h-[200px] p-6 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default preview;
