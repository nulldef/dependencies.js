import "reflect-metadata"

type Constructor<T = any> = new (...args: any[]) => T
type Token<T = any> = Constructor<T> | string

const DEPS_KEY = Symbol.for("di:dependencies")

export class Container {
  private registry = new Map<string, Constructor>()
  private instances = new Map<Constructor, any>()

  get<T>(token: Token<T> | string, resolving = new Set<Constructor>()): T {
    const constructor = this.getConstructor(token)

    if (this.instances.has(constructor)) {
      return this.instances.get(constructor) as T
    }

    if (resolving.has(constructor)) {
      const chain = [...resolving, constructor].map(t => t.name).join(" -> ")
      throw new Error(`Circular dependency detected: ${chain}`)
    }

    resolving.add(constructor)

    const deps: Token[] = Reflect.getMetadata(DEPS_KEY, constructor) ?? []

    const resolvedDeps = deps.map(dep => this.get(dep, resolving))

    resolving.delete(constructor)

    const instance = new constructor(...resolvedDeps)
    this.instances.set(constructor, instance)
    return instance
  }

  register(target: Constructor, as: string): void {
    if (this.registry.has(as)) {
      throw new Error(`Token "${as}" is already registered`)
    }

    this.registry.set(as, target)
  }

  reset(): void {
    this.instances.clear()
    this.registry.clear()
  }

  private getConstructor<T>(token: Token<T>): Constructor<T> {
    const alias = typeof token === "string" ? token : token.name

    if (!this.registry.has(alias)) {
      throw new Error(`"${alias}" is not registered. Did you forget @Injectable?`)
    }

    return this.registry.get(alias) as Constructor<T>
  }
}

export const container = new Container()

export const Injectable =
  (as?: string) =>
  <T extends Constructor>(target: T): T => {
    container.register(target, as ?? target.name)
    return target
  }

export const Inject = (...deps: Token[]) => {
  return <T extends Constructor>(target: T): T => {
    Reflect.defineMetadata(DEPS_KEY, deps, target)
    return target
  }
}
