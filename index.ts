import "reflect-metadata"

type Constructor<T = any> = new (...args: any[]) => T

const DEPS_KEY = Symbol("di:dependencies")

const registry = new Map<Constructor, boolean>()
const instances = new Map<Constructor, any>()

export const Injectable =
  () =>
  <T extends Constructor>(target: T): T => {
    registry.set(target, true)
    return target
  }

export const Inject = (...deps: Constructor[]): ClassDecorator => {
  return target => {
    Reflect.defineMetadata(DEPS_KEY, deps, target)
  }
}

export const container = {
  get<T>(token: Constructor<T>, resolving = new Set<Constructor>()): T {
    if (instances.has(token)) {
      return instances.get(token) as T
    }

    if (!registry.has(token)) {
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
    instances.set(token, instance)
    return instance
  },

  reset(): void {
    instances.clear()
  },
}
