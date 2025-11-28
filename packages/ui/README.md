# Von - @von/ui

<p align="center">
  <a href="../../../LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19+-blue.svg" alt="React"></a>
  <a href="https://base-ui.com/"><img src="https://img.shields.io/badge/Base_UI-Built_On-purple.svg" alt="Base UI"></a>
</p>

Shared React UI components for Von’s dashboard and apps, providing reusable, consistently styled building blocks across all web interfaces.

Built on top of [coss ui](https://coss.com/ui) (Base UI + Tailwind CSS v4).

## Installation

```bash
bun add @von/ui
```

## Usage

```typescript
import { Button } from '@von/ui';
import '@von/ui/styles';

const App = () => {
  return <Button variant="default">Click me</Button>;
};
```

## Adding Components

Components are managed via shadcn CLI:

```bash
cd packages/ui
bunx --bun shadcn@latest add @coss/button
```

## License

MIT - see [LICENSE-MIT](../../../LICENSE-MIT)
