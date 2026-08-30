import type { Preview } from '@storybook/react-vite'
import '../src/design-system/tokens.css'
import '../src/index.css'

const preview: Preview = {
  parameters: { a11y: { test: 'error' }, layout: 'centered' },
}
export default preview
