class State {
    private readonly store = new Map<string, any>();
  
    get<T>(name: string): T {
      return this.store.get(name)!;
    }
  
    add<T>(name: string, item: T): void {
      this.store.set(name, item);
    }
  }
  
  const state = new State();
  
  export function useState<T>(name: string): T {
    return state.get(name);
  }
  
  export function setState<T>(name: string, value: T): void {
    state.add(name, value);
  }
  