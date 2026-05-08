export declare class ChartRunnerSDK {
    constructor();
    setHostMode(mode: any): boolean;
    on(evt: any, fn: any): void;
    _emit(evt: any, p: any): void;
    _id(): number;
    ladder({ side, rungs, spacing, size, price }: {
        side?: string | undefined;
        rungs?: number | undefined;
        spacing?: number | undefined;
        size?: number | undefined;
        price: any;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        size: number;
    }[];
    fibLadder({ side, size, price, base }?: {
        side?: string | undefined;
        size?: number | undefined;
        base?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        size: number;
    }[];
    bracket({ risk, rr, side, price, slDistance }: {
        risk?: number | undefined;
        rr?: number | undefined;
        side?: string | undefined;
        price: any;
        slDistance?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        entry: any;
        tp: any;
        sl: any;
        size: number;
        risk: number;
        rr: number;
        slDistance: number;
        status: string;
        openedAt: number;
        pnl: number;
    };
    oco({ upper, lower, size, price }: {
        upper?: number | undefined;
        lower?: number | undefined;
        size?: number | undefined;
        price: any;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        size: number;
        pair: null;
    }[];
    trailStop({ id, distance }?: {}): any;
    inverseBracket({ side, risk, rr, price, slDistance }?: {
        side?: string | undefined;
        risk?: number | undefined;
        rr?: number | undefined;
        slDistance?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        entry: any;
        tp: any;
        sl: any;
        size: number;
        risk: number;
        rr: number;
        slDistance: number;
        status: string;
        openedAt: number;
        pnl: number;
    };
    closeAll({ types }?: {
        types?: string[] | undefined;
    }): {
        count: number;
        ids: any[];
    };
    toggleIndicator({ name, visible, duration }?: {
        name?: string | undefined;
        visible?: boolean | undefined;
        duration?: number | undefined;
    }): {
        id: number;
        type: string;
        name: string;
        visible: boolean;
        until: number | null;
    };
    hedgeParachute({ duration, side, price, risk }?: {
        duration?: number | undefined;
        side?: string | undefined;
        risk?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        entry: any;
        tp: any;
        sl: any;
        size: number;
        risk: number;
        rr: number;
        slDistance: number;
        status: string;
        openedAt: number;
        pnl: number;
    } | {
        id: number;
        type: string;
        until: number;
        orderId: number | null;
    } | null;
    liquidityRadar({ range }?: {
        range?: number | undefined;
    }): {
        id: number;
        type: string;
        name: string;
        visible: boolean;
        until: number | null;
    } | {
        id: number;
        type: string;
        until: number;
        range: number;
    };
    rescueDrone(): {
        count: number;
        ids: any[];
    } | {
        id: number;
        type: string;
        armed: boolean;
        flattenedCount: number;
    };
    /** Instant fill at current price. Pure entry, no TP/SL coupling. Useful
     *  for momentum entries where the player wants exposure NOW and will
     *  manage exits later (via stopLoss / takeProfit). */
    market({ side, size, price }?: {
        side?: string | undefined;
        size?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        entry: any;
        size: number;
        filledAt: number;
        status: string;
        pnl: number;
    } | null;
    /** Resting limit order. Fills when price crosses. Decouples entry from
     *  exit (unlike bracket which forces TP+SL coupling at creation). */
    limit({ side, price, size }?: {
        side?: string | undefined;
        size?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        size: number;
        status: string;
    } | null;
    /** Add or move a stop-loss on an existing open position (bracket or
     *  market). Returns the patched order or null if not found. */
    stopLoss({ id, price }?: {}): any;
    /** Add or move a take-profit on an existing open position. Symmetric to
     *  stopLoss. Useful after entering with market() and deciding the exit
     *  level reactively. */
    takeProfit({ id, price }?: {}): any;
    /** Partial close at a specified fraction of the position size. Pro-trader
     *  signature ("take 25% off at 2R"). Reduces `size` on the live order,
     *  records realized P&L on the closed slice, and emits a 'partial' event
     *  so visual overlays can fade the closed quarter. */
    scaleOut({ id, fraction, price }?: {
        fraction?: number | undefined;
    }): any;
    /** Time-Weighted Average Price. Splits a total size into N market slices
     *  fired at fixed intervals. Real venues (Hyperliquid, Binance) ship this
     *  natively; we schedule slices via setTimeout so the standalone game
     *  shows the staggered fills as the chart progresses. */
    twap({ side, totalSize, slices, intervalSecs, price }?: {
        side?: string | undefined;
        totalSize?: number | undefined;
        slices?: number | undefined;
        intervalSecs?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        totalSize: number;
        sliceSize: number;
        slices: number;
        intervalSecs: number;
        fired: number;
        slices_orders: never[];
        status: string;
        createdAt: number;
    } | null;
    /** Iceberg: large order with only a small visible portion. As each visible
     *  slice fills, the next slice is exposed. In standalone we model this
     *  as N stacked limit orders at the same price — only the front one is
     *  flagged 'visible'; the others are 'hidden' until promoted. */
    iceberg({ side, visibleSize, hiddenSize, price }?: {
        side?: string | undefined;
        visibleSize?: number | undefined;
        hiddenSize?: number | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        slices: number[];
    } | null;
    /** Trailing take-profit: TP that ratchets UP with price for longs (DOWN
     *  for shorts). Mirror of trailStop on the upside. The fill check in
     *  tick() reads `tp` so the per-frame ratchet update is enough. */
    trailingTakeProfit({ id, distance }?: {}): any;
    /** OCO bracket: two pending bracket entries; first to fill cancels the
     *  other. Common breakout setup ("buy on break above X, sell on break
     *  below Y"). Returns the pair as { up, down }. */
    ocoBracket({ upper, lower, side, risk, rr, slDistance }?: {
        side?: string | undefined;
        risk?: number | undefined;
        rr?: number | undefined;
        slDistance?: number | undefined;
    }): {
        up: {
            id: number;
            type: string;
            side: string;
            entry: any;
            tp: any;
            sl: any;
            size: number;
            risk: number;
            rr: number;
            slDistance: number;
            status: string;
            openedAt: number;
            pnl: number;
        };
        down: {
            id: number;
            type: string;
            side: string;
            entry: any;
            tp: any;
            sl: any;
            size: number;
            risk: number;
            rr: number;
            slDistance: number;
            status: string;
            openedAt: number;
            pnl: number;
        };
    } | null;
    /** Conditional / If-Then: when `triggerPrice` is touched, execute `then`
     *  (a function that receives the SDK and returns whatever ix it builds).
     *  The watcher is checked in tick() via `pendingConditionals[]`. */
    ifThen({ triggerPrice, side, then }?: {
        side?: string | undefined;
    }): {
        id: number;
        type: string;
        triggerPrice: any;
        side: string;
        then: any;
        armed: boolean;
        createdAt: number;
    } | null;
    /** Funding-rate snipe: auto-enter when perp funding crosses threshold.
     *  In standalone this is 'reframe' — we don't have live funding feed yet,
     *  so we emit a deferred-signal event the strategy markers system can
     *  pick up. In TV/HL host mode this would subscribe to the venue's
     *  funding stream and fire a real entry on cross. */
    fundingSnipe({ asset, threshold, side, risk }?: {
        asset?: string | undefined;
        threshold?: number | undefined;
        side?: string | undefined;
        risk?: number | undefined;
    }): {
        id: number;
        type: string;
        asset: string;
        threshold: number;
        side: string;
        risk: number;
        armed: boolean;
        createdAt: number;
    };
    /** Borrow-then-short DeFi flow. Standalone composes it as a flagged
     *  short position; the borrow leg is implicit (perps already shoulder
     *  this on the venue side). The flag tells partner integrations to
     *  source collateral from the lending market instead of margin. */
    borrowShort({ asset, size, collateralAsset, collateralSize, price }?: {
        asset?: string | undefined;
        size?: number | undefined;
        collateralAsset?: string | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        entry: any;
        size: number;
        filledAt: number;
        status: string;
        pnl: number;
    } | null;
    /** Liquidation guard: when a position's margin ratio crosses `marginRatio`,
     *  auto-add margin to push it back. Pure gameplay framing of "don't get
     *  rekt." Standalone composes by tagging the order; tick() honors the
     *  flag during the existing P&L update path. */
    liquidationGuard({ id, marginRatio, addAmount }?: {
        marginRatio?: number | undefined;
        addAmount?: number | undefined;
    }): any;
    /** Copy-trade: mirror another wallet's positions at a size multiplier.
     *  Reframe in standalone — we don't fetch other wallets here. Phase 2
     *  on-chain leaderboard PDAs make this a one-liner: subscribe to the
     *  followee's RunRecord events, replicate at 1:scale. */
    copyTrade({ walletAddr, sizeMultiplier, autoStop }?: {
        sizeMultiplier?: number | undefined;
        autoStop?: boolean | undefined;
    }): {
        id: number;
        type: string;
        walletAddr: any;
        sizeMultiplier: number;
        autoStop: boolean;
        active: boolean;
        createdAt: number;
    };
    /** Perp flip: close current position + open opposite-side same-size in one
     *  conceptual ix. Real venues (HL, Drift) ship this as 'reduceOnly' +
     *  immediate inverse market. Standalone composes from closeAll(side) +
     *  market(opposite). Useful for momentum reversals. */
    perpFlip({ id, price }?: {}): {
        id: number;
        type: string;
        side: string;
        entry: any;
        size: number;
        filledAt: number;
        status: string;
        pnl: number;
    } | null;
    /** Combo trade: fires a pre-baked multi-leg setup by name. The playbook
     *  is data-driven so partners + Workbench builders can register their own
     *  named setups. Default registrations cover three classics. */
    comboTrade({ setup, price, size, risk }?: {
        setup?: string | undefined;
        size?: number | undefined;
        risk?: number | undefined;
    }): any;
    /** Auto-fib: detect the visible swing high/low (passed in by caller) and
     *  delegate to fibLadder with the correct base + side. Saves the player
     *  from having to manually two-anchor a fib.
     *  v0.9.10 — also pushes a fibRetrace overlay with Champions Channel band on
     *  so the player gets visual confirmation of the 0.618–0.66 high-probability
     *  bounce zone alongside the order ladder. */
    autoFib({ swingHigh, swingLow, swingHighWx, swingLowWx, side, size, drawOverlay }?: {
        side?: string | undefined;
        size?: number | undefined;
        drawOverlay?: boolean | undefined;
    }): {
        id: number;
        type: string;
        side: string;
        price: any;
        size: number;
    }[] | null;
    /** Magnet: pulls open positions toward a target by tightening the SL on
     *  every tick. Pure gameplay primitive — no real-world equivalent. The
     *  per-frame tighten is handled in tick() via the `magnet` flag. */
    magnet({ id, target, strength }?: {
        strength?: number | undefined;
    }): any;
    registerScoreComponent(id: any, fn: any, defaultWeight?: number): void;
    scoreSetup(opts: any): {
        score: number;
        max: number;
        components: never[];
        recommendation: string;
        side?: undefined;
        price?: undefined;
    } | {
        score: number;
        max: number;
        components: {
            id: string;
            label: any;
            pts: any;
        }[];
        recommendation: string;
        side: any;
        price: any;
    };
    detectCCV(opts: any): {
        matched: boolean;
        side: string;
        components: never[];
        banner: string;
        price?: undefined;
    } | {
        matched: boolean;
        side: string;
        components: {
            id: string;
            label: string;
            ok: boolean;
        }[];
        banner: string;
        price: any;
    };
    _findSwings(candles: any, kind: any, windowBars: any): {
        idx: any;
        price: any;
    }[];
    detectBumpAndRun(opts: any): {
        matched: boolean;
        side: string;
        leadSlope?: undefined;
        bumpSlope?: undefined;
        leadAtNow?: undefined;
        price?: undefined;
    } | {
        matched: boolean;
        side: string;
        leadSlope: number;
        bumpSlope: number;
        leadAtNow: any;
        price: any;
    };
    detectHeadShoulders(opts: any): {
        matched: boolean;
        side: string;
        neckline?: undefined;
        LS?: undefined;
        H?: undefined;
        RS?: undefined;
        LL?: undefined;
        RL?: undefined;
        price?: undefined;
        kind?: undefined;
        LH?: undefined;
        RH?: undefined;
    } | {
        matched: boolean;
        side: string;
        neckline: any;
        LS: {
            idx: any;
            price: any;
        };
        H: {
            idx: any;
            price: any;
        };
        RS: {
            idx: any;
            price: any;
        };
        LL: {
            idx: any;
            price: any;
        };
        RL: {
            idx: any;
            price: any;
        };
        price: any;
        kind: string;
        LH?: undefined;
        RH?: undefined;
    } | {
        matched: boolean;
        side: string;
        neckline: any;
        LS: {
            idx: any;
            price: any;
        };
        H: {
            idx: any;
            price: any;
        };
        RS: {
            idx: any;
            price: any;
        };
        LH: {
            idx: any;
            price: any;
        };
        RH: {
            idx: any;
            price: any;
        };
        price: any;
        kind: string;
        LL?: undefined;
        RL?: undefined;
    };
    detectSFP(opts: any): {
        matched: boolean;
        side: string;
        level?: undefined;
        kind?: undefined;
        price?: undefined;
    } | {
        matched: boolean;
        side: string;
        level: any;
        kind: string | null;
        price: any;
    };
    detectFailedAuction(opts: any): {
        matched: boolean;
        side: string;
        reason?: undefined;
        kind?: undefined;
        dOpen?: undefined;
        pdVAH?: undefined;
        pdVAL?: undefined;
        price?: undefined;
    } | {
        matched: boolean;
        side: string;
        reason: string;
        kind?: undefined;
        dOpen?: undefined;
        pdVAH?: undefined;
        pdVAL?: undefined;
        price?: undefined;
    } | {
        matched: boolean;
        side: string;
        kind: string | null;
        dOpen: any;
        pdVAH: any;
        pdVAL: any;
        price: any;
        reason?: undefined;
    };
    detectOIConfirm(opts: any): {
        matched: boolean;
        side: string;
        pending: boolean;
        sym: any;
        period: any;
        kind?: undefined;
        oiChg?: undefined;
        pChg?: undefined;
        oiNow?: undefined;
        oiPrev?: undefined;
    } | {
        matched: boolean;
        side: string;
        sym: any;
        period: any;
        pending?: undefined;
        kind?: undefined;
        oiChg?: undefined;
        pChg?: undefined;
        oiNow?: undefined;
        oiPrev?: undefined;
    } | {
        matched: boolean;
        side: any;
        kind: string | null;
        oiChg: number;
        pChg: number;
        oiNow: any;
        oiPrev: any;
        sym: any;
        period: any;
        pending?: undefined;
    };
    tick({ price, t }: {
        price: any;
        t: any;
    }): void;
    unrealized(price: any): number;
    findOrder(id: any): any;
    cancelOrder(id: any): boolean;
    editOrder(id: any, patch: any): boolean;
}
//# sourceMappingURL=ChartRunnerSDK.d.ts.map