import "reflect-metadata"

import { beforeEach, describe, expect, it } from "bun:test"

import { Container, Inject, InjectProp, Injectable, container } from "./index"

const DEPS_KEY = Symbol.for("di:dependencies")

describe("Container", () => {
  let c: Container

  beforeEach(() => {
    c = new Container()
  })

  it("resolves a registered class with no dependencies", () => {
    class Foo {}
    c.register("Foo", Foo)
    const instance = c.get(Foo)
    expect(instance).toBeInstanceOf(Foo)
  })

  it("returns the same singleton instance on repeated gets", () => {
    class Foo {}
    c.register("Foo", Foo)
    expect(c.get(Foo)).toBe(c.get(Foo))
  })

  it("throws when resolving an unregistered class", () => {
    class Foo {}
    expect(() => c.get(Foo)).toThrow(/not registered/)
  })

  it("throws when resolving an unknown string token", () => {
    expect(() => c.get("Missing")).toThrow(/not registered/)
  })

  it("throws when registering the same token twice", () => {
    class Foo {}
    class Bar {}
    c.register("Same", Foo)
    expect(() => c.register("Same", Bar)).toThrow(/already registered/)
  })

  it("replace updates the implementation for a token before first resolve", () => {
    class First {}
    class Second {}
    c.register("Impl", First)
    c.replace("Impl", Second)
    expect(c.get("Impl")).toBeInstanceOf(Second)
  })

  it("replace throws when the token is not registered", () => {
    class Foo {}
    expect(() => c.replace("Unknown", Foo)).toThrow(/not registered/)
  })

  it("replace points the token at a new constructor; singletons are keyed by constructor", () => {
    class First {}
    class Second {}
    c.register("Impl", First)
    const first = c.get("Impl")
    c.replace("Impl", Second)
    const afterReplace = c.get<Second>("Impl")
    expect(first).toBeInstanceOf(First)
    expect(afterReplace).toBeInstanceOf(Second)
    expect(afterReplace).not.toBe(first)
    expect(c.get<Second>("Impl")).toBe(afterReplace)
  })

  it("setInstance supplies a pre-built instance for get without calling the constructor", () => {
    let constructed = 0
    class Api {
      constructor() {
        constructed++
      }
    }
    c.register("Api", Api)
    const stub = {} as Api
    c.setInstance(Api, stub)
    expect(c.get(Api)).toBe(stub)
    expect(constructed).toBe(0)
  })

  it("setInstance works with a string token matching the registered alias", () => {
    class Api {}
    c.register("Api", Api)
    const stub = {} as Api
    c.setInstance("Api", stub)
    expect(c.get<Api>("Api")).toBe(stub)
    expect(c.get<Api>(Api)).toBe(stub)
  })

  it("setInstance throws when the token is not registered", () => {
    class Unregistered {}
    expect(() => c.setInstance(Unregistered, {} as Unregistered)).toThrow(/not registered/)
  })

  it("setInstance replaces an already resolved singleton", () => {
    class Foo {
      tag = "original"
    }
    c.register("Foo", Foo)
    const first = c.get(Foo)
    const replacement = new Foo()
    replacement.tag = "replaced"
    c.setInstance(Foo, replacement)
    expect(c.get(Foo)).toBe(replacement)
    expect(c.get(Foo).tag).toBe("replaced")
    expect(first.tag).toBe("original")
  })

  it("setInstance is used when injecting dependencies", () => {
    class Logger {
      level = "default"
    }
    class Service {
      constructor(public logger: Logger) {}
    }
    Reflect.defineMetadata(DEPS_KEY, [Logger], Service)

    c.register("Logger", Logger)
    c.register("Service", Service)

    const fakeLogger = new Logger()
    fakeLogger.level = "test"
    c.setInstance(Logger, fakeLogger)

    const service = c.get(Service)
    expect(service.logger).toBe(fakeLogger)
    expect(service.logger.level).toBe("test")
  })

  it("reset clears instances set via setInstance", () => {
    class Foo {}
    c.register("Foo", Foo)
    c.setInstance(Foo, {} as Foo)
    c.reset()
    expect(() => c.get(Foo)).toThrow(/not registered/)
  })

  it("resolves by string token when no dependencies", () => {
    class Foo {}
    c.register("Foo", Foo)
    expect(c.get<Foo>("Foo")).toBeInstanceOf(Foo)
    expect(c.get<Foo>("Foo")).toBe(c.get(Foo))
  })

  it("resolves by string token when class has @Inject metadata", () => {
    class Logger {}
    class Service {
      constructor(public logger: Logger) {}
    }

    Reflect.defineMetadata(DEPS_KEY, [Logger], Service)

    c.register("Logger", Logger)
    c.register("Service", Service)

    const byName = c.get<Service>("Service")
    expect(byName).toBeInstanceOf(Service)
    expect(byName.logger).toBeInstanceOf(Logger)
  })

  it("resolves dependencies declared as string tokens", () => {
    class Logger {}
    class Service {
      constructor(public logger: Logger) {}
    }

    Reflect.defineMetadata(DEPS_KEY, ["Logger"], Service)

    c.register("Logger", Logger)
    c.register("Service", Service)

    const service = c.get(Service)
    expect(service.logger).toBeInstanceOf(Logger)
  })

  it("resolves dependencies via @Inject metadata", () => {
    class Logger {
      log(msg: string) {
        return msg
      }
    }

    class Service {
      constructor(public logger: Logger) {}
    }

    Reflect.defineMetadata(DEPS_KEY, [Logger], Service)

    c.register("Logger", Logger)
    c.register("Service", Service)

    const service = c.get(Service)
    expect(service).toBeInstanceOf(Service)
    expect(service.logger).toBeInstanceOf(Logger)
  })

  it("detects circular dependencies", () => {
    class A {}
    class B {}

    Reflect.defineMetadata(DEPS_KEY, [B], A)
    Reflect.defineMetadata(DEPS_KEY, [A], B)

    c.register("A", A)
    c.register("B", B)

    expect(() => c.get(A)).toThrow(/Circular dependency detected/)
  })

  it("reset clears both instances and registry", () => {
    class Foo {}
    c.register("Foo", Foo)
    c.get(Foo)
    c.reset()
    expect(() => c.get(Foo)).toThrow(/not registered/)
  })

  it("get requires correct this when taken off the container (destructuring)", () => {
    class Foo {}
    c.register("Foo", Foo)
    const { get } = c
    expect(() => get(Foo)).toThrow()
    expect(get.bind(c)(Foo)).toBeInstanceOf(Foo)
  })
})

describe("Container.setInstance with @Injectable", () => {
  beforeEach(() => {
    container.reset()
  })

  it("injects a setInstance override into a dependent service", () => {
    @Injectable()
    class Logger {
      tag = "live"
    }

    @Injectable()
    @Inject(Logger)
    class Service {
      constructor(public logger: Logger) {}
    }

    const mock = new Logger()
    mock.tag = "mock"
    container.setInstance(Logger, mock)

    const service = container.get(Service)
    expect(service.logger).toBe(mock)
    expect(service.logger.tag).toBe("mock")
  })

  it("accepts a custom @Injectable alias as the token", () => {
    @Injectable("AppLogger")
    class Logger {}

    const stub = {} as Logger
    container.setInstance("AppLogger", stub)
    expect(container.get<Logger>("AppLogger")).toBe(stub)
  })
})

describe("Container.replace with @Inject", () => {
  beforeEach(() => {
    container.reset()
  })

  it("uses the replaced dependency when resolved after replace", () => {
    @Injectable()
    class LoggerV1 {
      tag = "v1"
    }

    @Injectable()
    class LoggerV2 {
      tag = "v2"
    }

    @Injectable()
    @Inject(LoggerV1)
    class Service {
      constructor(public logger: LoggerV1 | LoggerV2) {}
    }

    container.replace("LoggerV1", LoggerV2)

    const service = container.get<Service>(Service)
    expect(service.logger).toBeInstanceOf(LoggerV2)
    expect(service.logger.tag).toBe("v2")
  })
})

describe("@Injectable decorator", () => {
  beforeEach(() => {
    container.reset()
  })

  it("registers the class in the default container", () => {
    @Injectable()
    class MyService {}

    const instance = container.get(MyService)
    expect(instance).toBeInstanceOf(MyService)
  })

  it("registers under a custom token when provided", () => {
    @Injectable("NamedService")
    class MyService {}

    const instance = container.get("NamedService")
    expect(instance).toBeInstanceOf(MyService)
  })
})

describe("@Inject decorator", () => {
  beforeEach(() => {
    container.reset()
  })

  it("sets dependency metadata and resolves them", () => {
    @Injectable()
    class Database {}

    @Injectable()
    @Inject(Database)
    class UserRepo {
      constructor(public db: Database) {}
    }

    const repo = container.get(UserRepo)
    expect(repo).toBeInstanceOf(UserRepo)
    expect(repo.db).toBeInstanceOf(Database)
  })

  it("resolves a deep dependency chain", () => {
    @Injectable()
    class Config {}

    @Injectable()
    @Inject(Config)
    class Database {
      constructor(public config: Config) {}
    }

    @Injectable()
    @Inject(Database)
    class UserRepo {
      constructor(public db: Database) {}
    }

    const repo = container.get(UserRepo)
    expect(repo.db.config).toBeInstanceOf(Config)
  })

  it("resolves a dependency registered with a custom @Injectable token", () => {
    @Injectable("AppConfig")
    class Config {}

    @Injectable()
    @Inject("AppConfig")
    class Database {
      constructor(public config: Config) {}
    }

    const db = container.get(Database)
    expect(db.config).toBeInstanceOf(Config)
  })
})

describe("@InjectProp decorator", () => {
  beforeEach(() => {
    container.reset()
  })

  it("sets dependency metadata and resolves them", () => {
    @Injectable()
    class Database {}

    @Injectable()
    class UserRepo {
      @InjectProp(Database)
      public db!: Database
    }

    const repo = container.get(UserRepo)
    expect(repo).toBeInstanceOf(UserRepo)
    expect(repo.db).toBeInstanceOf(Database)
  })

  it("resolves a deep dependency chain", () => {
    @Injectable()
    class Config {}

    @Injectable()
    @Inject(Config)
    class Database {
      constructor(public config: Config) {}
    }

    @Injectable()
    class UserRepo {
      @InjectProp(Database)
      public db!: Database
    }

    const repo = container.get(UserRepo)
    expect(repo.db.config).toBeInstanceOf(Config)
  })

  it("resolves a dependency registered with a custom @Injectable token", () => {
    @Injectable("AppConfig")
    class Config {}

    @Injectable()
    class Database {
      @InjectProp("AppConfig")
      public config!: Config
    }

    const db = container.get(Database)
    expect(db.config).toBeInstanceOf(Config)
  })

  it("throws an error when setter is used", () => {
    @Injectable("AppConfig")
    class Config {}

    @Injectable()
    class Database {
      @InjectProp("AppConfig")
      public config!: Config
    }

    const db = container.get<Database>(Database)
    expect(() => (db.config = new Config())).toThrow(/Cannot set injected property/)
  })
})
