// AbilityRegistry — every trading primitive is an Ability.
//
// The point of this layer is the project's hard rule: abilities never touch
// the canvas; the SDK is the only thing that issues orders. An Ability:
//   1. registers itself once (id, optional hotkey, cooldown, icon)
//   2. on fire, calls into the BrokerAdapter via AbilityContext
//   3. optionally requests an overlay draw — but does not own the canvas
//
// Adding a new primitive is one registry call. The renderer doesn't care.
export class AbilityRegistry {
    abilities = new Map();
    register(ability) {
        if (this.abilities.has(ability.id)) {
            throw new Error(`AbilityRegistry: duplicate id "${ability.id}"`);
        }
        this.abilities.set(ability.id, ability);
    }
    unregister(id) {
        return this.abilities.delete(id);
    }
    get(id) {
        return this.abilities.get(id);
    }
    list() {
        return Array.from(this.abilities.values());
    }
    byCategory(cat) {
        return this.list().filter(a => a.cat === cat);
    }
    byKey(key) {
        return this.list().find(a => a.key === key);
    }
}
//# sourceMappingURL=AbilityRegistry.js.map