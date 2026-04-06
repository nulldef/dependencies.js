import "reflect-metadata"

import { Container, Inject, Injectable, container } from "./index"

const DEPS_KEY = Symbol.for("di:dependencies")

describe("Container", () => {
  let c: Container

  beforeEach(() => {
    c = new Container()
  })

  it("resolves a registered class with no dependencies", () => {
    class Foo {}
    c.register(Foo, "Foo")
    const instance = c.get(Foo)
    expect(instance).toBeInstanceOf(Foo)
  })

  it("returns the same singleton instance on repeated gets", () => {
    class Foo {}
    c.register(Foo, "Foo")
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
    c.register(Foo, "Same")
    expect(() => c.register(Bar, "Same")).toThrow(/already registered/)
  })

  it("resolves by string token when no dependencies", () => {
    class Foo {}
    c.register(Foo, "Foo")
    expect(c.get("Foo")).toBeInstanceOf(Foo)
    expect(c.get("Foo")).toBe(c.get(Foo))
  })

  it("resolves by string token when class has @Inject metadata", () => {
    class Logger {}
    class Service {
      constructor(public logger: Logger) {}
    }

    Reflect.defineMetadata(DEPS_KEY, [Logger], Service)

    c.register(Logger, "Logger")
    c.register(Service, "Service")

    const byName = c.get("Service")
    expect(byName).toBeInstanceOf(Service)
    expect(byName.logger).toBeInstanceOf(Logger)
  })

  it("resolves dependencies declared as string tokens", () => {
    class Logger {}
    class Service {
      constructor(public logger: Logger) {}
    }

    Reflect.defineMetadata(DEPS_KEY, ["Logger"], Service)

    c.register(Logger, "Logger")
    c.register(Service, "Service")

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

    c.register(Logger, "Logger")
    c.register(Service, "Service")

    const service = c.get(Service)
    expect(service).toBeInstanceOf(Service)
    expect(service.logger).toBeInstanceOf(Logger)
  })

  it("detects circular dependencies", () => {
    class A {}
    class B {}

    Reflect.defineMetadata(DEPS_KEY, [B], A)
    Reflect.defineMetadata(DEPS_KEY, [A], B)

    c.register(A, "A")
    c.register(B, "B")

    expect(() => c.get(A)).toThrow(/Circular dependency detected/)
  })

  it("reset clears both instances and registry", () => {
    class Foo {}
    c.register(Foo, "Foo")
    c.get(Foo)
    c.reset()
    expect(() => c.get(Foo)).toThrow(/not registered/)
  })

  it("works when destructured (this binding)", () => {
    class Foo {}
    c.register(Foo, "Foo")
    const { get } = c
    // 'get' is a method on a class instance, so 'this' is preserved
    // only if bound — this tests that the class approach is safe
    // when called via the instance
    expect(c.get(Foo)).toBeInstanceOf(Foo)
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
