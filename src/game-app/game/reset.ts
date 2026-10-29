// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { G } from './state';
import { cfg } from './config';
import { SEG, GAP0, LANE } from './constants';
import { segs, dress } from '../world/segments';
import { obs, clues } from '../world/level';
import { getBodySensorLane } from '../input/body-sensor';

/** Posiciona jogador, suspeito e cenário. Com useCp, volta ao checkpoint. */
export function reset(useCp: boolean) {
  const z0 = useCp && G.cp ? G.cp.z : 0;
  if (!useCp) G.cp = null;

  const initLane = cfg.bodyTrack ? getBodySensorLane() : 0;
  G.lane = initLane;
  G.px = initLane * LANE;
  G.pz = z0; G.py = 0; G.vy = 0; G.speed = 0;
  G.eye = 1.7; G.bobP = 0; G.dip = 0; G.shake = 0; G.hitCd = 0;
  G.stam = 100; G.lock = false; G.fin = false; G.finT = 0;
  G.hp = useCp && G.cp ? (G.cp.hp ?? 100) : 100;
  G.failReason = 'escaped';
  G.runT = useCp && G.cp ? G.cp.t : 0;

  G.fz = z0 - GAP0; G.fx = 0; G.fy = 0; G.fcr = 1; G.ftl = 0;
  G.stats = useCp && G.cp
    ? { ...G.cp.S }
    : { cleared: 0, hits: 0, clues: 0, streak: 0, best: 0 };

  segs.forEach((s, i) => {
    s.position.z = z0 + SEG - i * SEG;
    dress(s);
  });

  obs.forEach((o) => {
    o.z = o.initialZ;
    o.m.position.z = o.z;
    if (o.kind === 'moto') {
      o.currentX = o.lanes[0] * LANE;
      o.targetLane = o.lanes[0];
      o.m.position.x = o.currentX;
      o.m.rotation.z = 0;
      o.laneTimer = 1.5;
    } else if (o.currentX !== undefined) {
      o.m.position.x = o.currentX;
    }
    o.done = o.z > z0 - 0.5;
    o.hit = false;
  });
  G.ni = obs.findIndex((o) => !o.done);
  if (G.ni < 0) G.ni = obs.length;
  G.fi = obs.findIndex((o) => o.z < G.fz);
  if (G.fi < 0) G.fi = obs.length;

  clues.forEach((c) => {
    c.got = c.z > z0;
    c.m.visible = !c.got;
  });
}
