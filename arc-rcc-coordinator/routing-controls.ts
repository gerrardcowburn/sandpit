export interface RoutingControlMap {
    [system: string]: RoutingControlDetails;
    // systemA: RoutingControlDetails;
    // systemB: RoutingControlDetails;
    // systemC: RoutingControlDetails;
}

export interface RoutingControlDetails {
    routingControlArn: string;
    steadyState: "On" | "Off";
    failedState: "On" | "Off";
    override: "On" | "Off";
    currentState?: string;
}

export const routingControlMap: RoutingControlMap = {
    systemA: {
        routingControlArn: "arn:aws:route53-recovery-control::082910111533:controlpanel/388d14cb2e1442a2b50c8616d9af19a9/routingcontrol/2b17d931bde84e40",
        steadyState: "On",
        failedState: "Off",
        override: "Off"
    },
    systemB: {
        routingControlArn: "arn:aws:route53-recovery-control::082910111533:controlpanel/388d14cb2e1442a2b50c8616d9af19a9/routingcontrol/0a215b1e38764f0c",
        steadyState: "Off",
        failedState: "On",
        override: "Off"
    },
    systemC: {
        routingControlArn: "arn:aws:route53-recovery-control::082910111533:controlpanel/388d14cb2e1442a2b50c8616d9af19a9/routingcontrol/51365d1806c74800",
        steadyState: "Off",
        failedState: "Off",
        override: "On"
    }
}

export type ApplicationMode = "steadyState" | "failedState" | "override";
export const applicationMode: ApplicationMode = "steadyState";