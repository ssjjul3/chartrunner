import type { BracketOrder, LadderOrder, OCOOrder, OrderResult, Position, RiskMode } from './types.js';
export interface BrokerAdapter {
    readonly name: string;
    readonly mode: RiskMode;
    placeBracket(o: BracketOrder): Promise<OrderResult>;
    placeLadder(o: LadderOrder): Promise<OrderResult>;
    placeOCO(o: OCOOrder): Promise<OrderResult>;
    cancel(orderId: string): Promise<void>;
    getOpenPositions(): Promise<Position[]>;
    getEquity(): Promise<number>;
    /** subscribe to fill / close events. Returns unsubscribe. */
    onOrderUpdate(cb: (o: OrderResult) => void): () => void;
}
//# sourceMappingURL=BrokerAdapter.d.ts.map