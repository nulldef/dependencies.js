# dependencies.js

[![CI](https://github.com/nulldef/dependencies.js/actions/workflows/ci.yml/badge.svg)](https://github.com/nulldef/dependencies.js/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/nulldef/dependencies.js/graph/badge.svg)](https://codecov.io/gh/nulldef/dependencies.js)

A lightweight dependency injection container for TypeScript/JavaScript.

## Features

- Simple decorator-based API (`@Injectable`, `@Inject`)
- Automatic dependency resolution with singleton caching
- Circular dependency detection with clear error messages
- Zero configuration — just decorate and resolve

## Coverage

Each CI run writes a coverage table to the workflow **Summary** (GitHub Actions → run → Summary). To enable the [Codecov](https://codecov.io/gh/nulldef/dependencies.js) dashboard and README badge, add the repository on [codecov.io](https://codecov.io) and store its upload token as the `CODECOV_TOKEN` repository secret.

## Installation

```bash
npm install dependencies.js
```

## Quick Start

```typescript
import { Inject, Injectable, container } from "dependencies.js"

@Injectable()
class Logger {
  log(msg: string) {
    console.log(msg)
  }
}

@Injectable()
@Inject(Logger)
class UserService {
  constructor(public logger: Logger) {}

  greet(name: string) {
    this.logger.log(`Hello, ${name}!`)
  }
}

const userService = container.get(UserService)
userService.greet("World")
```

## API

### `@Injectable()`

Registers a class in the default container.

```typescript
@Injectable()
class MyService {}
```

### `@Inject(...deps)`

Declares constructor dependencies for a class.

```typescript
@Injectable()
@Inject(Database, Logger)
class UserRepo {
  constructor(
    public db: Database,
    public logger: Logger,
  ) {}
}
```

### `container`

The default `Container` instance. Use it to resolve registered classes.

```typescript
const service = container.get(UserService)
```

### `Container`

Create isolated containers when needed.

```typescript
import { Container } from "dependencies.js"

const c = new Container()
c.register(MyService)
const instance = c.get(MyService)
c.reset() // clears all registrations and cached instances
```

#### Methods

| Method             | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `get<T>(token)`    | Resolves and returns a singleton instance of the given class |
| `register(target)` | Registers a class in the container                           |
| `reset()`          | Clears all instances and registrations                       |

## Requirements

- TypeScript with decorators enabled
- `reflect-metadata` (included as a dependency)

## License

MIT
