import type { BrokerAdapter } from './BrokerAdapter.js';
import type { BracketOrder, LadderOrder, OCOOrder, OrderResult, Position, RiskMode } from './types.js';
export declare class SandboxBroker implements BrokerAdapter {
    readonly name = "sandbox";
    readonly mode: RiskMode;
    private openOrders;
    private subscribers;
    private equity;
    placeBracket(o: BracketOrder): Promise<OrderResult>;
    placeLadder(o: LadderOrder): Promise<OrderResult>;
    placeOCO(o: OCOOrder): Promise<OrderResult>;
    cancel(orderId: string): Promise<void>;
    getOpenPositions(): Promise<Position[]>;
    getEquity(): Promise<number>;
    onOrderUpdate(cb: (o: OrderResult) => void): () => void;
    tickFill(currentPrice: number): void;
    private emit;
}
//# sourceMappingURL=SandboxBroker.d.ts.map