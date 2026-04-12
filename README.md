# dependencies.js

[![CI](https://github.com/nulldef/dependencies.js/actions/workflows/ci.yml/badge.svg)](https://github.com/nulldef/dependencies.js/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/nulldef/dependencies.js/graph/badge.svg)](https://codecov.io/gh/nulldef/dependencies.js)

A lightweight dependency injection container for TypeScript/JavaScript.

## Features

- Simple decorator-based API (`@Injectable`, `@Inject`)
- Optional string tokens — register and resolve by name (`@Injectable("Alias")`, `@Inject("Token")`, `get("Token")`)
- Automatic dependency resolution with singleton caching
- Circular dependency detection with clear error messages
- `replace` — swap the implementation behind an existing token (for mocks or upgrades)
- `setInstance` — inject a pre-built instance (no constructor call), including for tests and overrides
- Zero configuration — just decorate and resolve

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

### `@Injectable(as?)`

Registers a class in the default container under the class name, or under a custom string token when `as` is provided.

```typescript
@Injectable()
class MyService {}

@Injectable("NamedService")
class Config {}
```

### `@Inject(...deps)`

Declares constructor dependencies. Each entry is a class constructor or a string token that must be registered on the same container.

```typescript
@Injectable()
@Inject(Database, Logger)
class UserRepo {
  constructor(
    public db: Database,
    public logger: Logger,
  ) {}
}

@Injectable("AppConfig")
class Config {}

@Injectable()
@Inject("AppConfig")
class Database {
  constructor(public config: Config) {}
}
```

### `container`

The default `Container` instance. Use it to resolve registered classes by constructor or by string token.

```typescript
const service = container.get(UserService)
const named = container.get("NamedService")
```

### `Container`

Create isolated containers when needed.

```typescript
import { Container } from "dependencies.js"

const c = new Container()
c.register("MyService", MyService)
const instance = c.get(MyService)
c.reset() // clears all registrations and cached instances
```

#### Methods

| Method                     | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `get<T>(token)`            | Resolves and returns a singleton for the token (class or registered name) |
| `register(as, target)`     | Registers `target` under the string token `as`                            |
| `replace(as, target)`      | Replaces the implementation for an existing token `as`                    |
| `setInstance(token, inst)` | Stores a pre-built instance for that token (skips constructor on `get`)   |
| `reset()`                  | Clears all instances and registrations                                    |

`replace` throws if the token was never registered. After `replace`, `get` uses the new constructor; cached instances are keyed by constructor, so replacing yields a new singleton for the new type.

`setInstance` works with a class or a string token that matches a registered name. It overrides an already resolved singleton and is respected when resolving dependencies.

## Requirements

- TypeScript with decorators enabled
- `reflect-metadata` (included as a dependency)

## License

MIT
