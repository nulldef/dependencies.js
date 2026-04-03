import "reflect-metadata"

type Constructor<T = any> = new (...args: any[]) => T

const DEPS_KEY = Symbol.for("di:dependencies")

export class Container {
  private registry = new Set<Constructor>()
  private instances = new Map<Constructor, any>()

  get<T>(token: Constructor<T>, resolving = new Set<Constructor>()): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T
    }

    if (!this.registry.has(token)) {
      throw new Error(`"${token.name}" is not registered. Did you forget @Injectable?`)
    }

    if (resolving.has(token)) {
      const chain = [...resolving, token].map(t => t.name).join(" -> ")
      throw new Error(`Circular dependency detected: ${chain}`)
    }

    resolving.add(token)

    const deps: Constructor[] = Reflect.getMetadata(DEPS_KEY, token) ?? []

    const resolvedDeps = deps.map(dep => this.get(dep, resolving))

    resolving.delete(token)

    const instance = new token(...resolvedDeps)
    this.instances.set(token, instance)
    return instance
  }

  register(target: Constructor): void {
    this.registry.add(target)
  }

  reset(): void {
    this.instances.clear()
    this.registry.clear()
  }
}

export const container = new Container()

export const Injectable =
  () =>
  <T extends Constructor>(target: T): T => {
    container.register(target)
    return target
  }

export const Inject = (...deps: Constructor[]) => {
  return <T extends Constructor>(target: T): T => {
    Reflect.defineMetadata(DEPS_KEY, deps, target)
    return target
  }
}
