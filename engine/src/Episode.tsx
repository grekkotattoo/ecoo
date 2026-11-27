import React from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {ease} from './lib/anim';
import {SceneView} from './Scene';
import {SceneView3D} from './three/Scene3D';
import type {EpisodeSpec, Shot, Style, Subtitle} from './types';

/** Carga fuentes locales servidas por el orquestador. Bloquea el render hasta tenerlas. */
export const useFonts = (style: Style) => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const urls = style.fonts.urls ?? {};
    const loads = Object.entries(urls).map(([family, url]) =>
      new FontFace(family, `url(${url})`).load().then((ff) => {
        (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      }).catch(() => undefined),
    );
    Promise.all(loads).then(() => continueRender(handle));
  }, [style, handle]);
};

export const Defs: React.FC<{style: Style; f: number}> = ({style, f}) => {
  const seed = Math.floor(f / Math.max(1, Math.round(30 / Math.max(1, style.boilFps))));
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <defs>
        <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={2} seed={seed % 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={style.boil * 6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.85} />
        </radialGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
};

/** Grano de papel + viñeta. Sin mix-blend-mode (provocaba parpadeo en el render). */
export const Overlay: React.FC<{style: Style; w: number; h: number}> = ({style, w, h}) => (
  <svg width={w} height={h} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    {style.grade ? (
      <>
        <defs>
          <linearGradient id="gradeTop" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor={style.grade.top} stopOpacity={style.grade.topOpacity * 2.2} />
            <stop offset="0.55" stopColor={style.grade.top} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradeBottom" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={style.grade.bottom} stopOpacity={style.grade.bottomOpacity * 2.2} />
            <stop offset="0.45" stopColor={style.grade.bottom} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="url(#gradeTop)" />
        <rect width={w} height={h} fill="url(#gradeBottom)" />
      </>
    ) : null}
    {style.grain > 0 ? <rect width={w} height={h} filter="url(#grain)" opacity={style.grain * 0.12} /> : null}
    {style.vignette > 0 ? <rect width={w} height={h} fill="url(#vignette)" opacity={style.vignette} /> : null}
  </svg>
);

const TitleCard: React.FC<{shot: Shot; f: number; style: Style; w: number; h: number}> = ({shot, f, style, w, h}) => {
  const t = shot.title ?? {text: ''};
  const s1 = ease('back', f / 12);
  const s2 = ease('back', (f - 8) / 12);
  const wob = Math.sin(f * 0.15) * 1.5;
  const rays = Array.from({length: 18}, (_, i) => {
    const a0 = (i / 18) * Math.PI * 2 + f * 0.004;
    const a1 = a0 + Math.PI / 18;
    const R = 2000;
    return `M${w / 2},${h / 2} L${w / 2 + Math.cos(a0) * R},${h / 2 + Math.sin(a0) * R} L${w / 2 + Math.cos(a1) * R},${h / 2 + Math.sin(a1) * R} Z`;
  }).join(' ');
  const acc = style.palette.accent ?? '#ffb703';
  return (
    <AbsoluteFill style={{background: shot.bgColor ?? style.palette.ink ?? '#1d1a17', alignItems: 'center', justifyContent: 'center', padding: 80}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="titleGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor={style.palette.purple ?? '#7b2cbf'} stopOpacity={0.9} />
            <stop offset="1" stopColor={shot.bgColor ?? style.palette.ink ?? '#000'} stopOpacity={1} />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="url(#titleGlow)" />
        <path d={rays} fill={acc} opacity={0.09} />
      </svg>
      {t.kicker ? (
        <div style={{fontFamily: style.fonts.kicker ?? style.fonts.title, fontSize: 74, whiteSpace: 'nowrap', color: acc, transform: `scale(${s1}) rotate(${-4 + wob}deg)`, textAlign: 'center',
          WebkitTextStroke: `6px ${style.palette.ink ?? '#1d1a17'}`, paintOrder: 'stroke fill', textShadow: `8px 8px 0 ${style.palette.shadow ?? '#000'}`}}>
          {t.kicker}
        </div>
      ) : null}
      <div style={{fontFamily: style.fonts.title, fontSize: 112, lineHeight: 1.02, color: '#ffffff', marginTop: 40, textAlign: 'center', position: 'relative',
        transform: `scale(${Math.max(0, s2)}) rotate(-2deg)`, WebkitTextStroke: `5px ${style.palette.ink ?? '#000'}`, paintOrder: 'stroke fill',
        textShadow: `0 8px 0 ${style.palette.pink ?? '#ff5d8f'}, 0 14px 0 ${style.palette.ink ?? '#000'}`}}>
        {t.text}
      </div>
      {t.sub ? <div style={{fontFamily: style.fonts.subtitle, fontSize: 48, color: style.palette.paper ?? '#fff', marginTop: 30, opacity: Math.max(0, Math.min(1, (f - 18) / 10))}}>{t.sub}</div> : null}
    </AbsoluteFill>
  );
};

const transitionStyle = (shot: Shot, f: number, w: number, h: number): React.CSSProperties => {
  const tr = shot.transitionIn;
  if (!tr || tr.type === 'cut' || f >= tr.dur) return {};
  const u = ease('inOut', f / tr.dur);
  switch (tr.type) {
    case 'fade':
      return {opacity: u};
    case 'wipe':
      return {clipPath: `inset(0 ${(1 - u) * 100}% 0 0)`};
    case 'iris':
      return {clipPath: `circle(${u * Math.hypot(w, h) * 0.6}px at 50% 50%)`};
    case 'whip':
      return {transform: `translateX(${(1 - u) * w}px)`, filter: `blur(${(1 - u) * 18}px)`};
    case 'smash':
      return {transform: `scale(${1.6 - 0.6 * u})`, opacity: Math.min(1, u * 3)};
    default:
      return {};
  }
};

const Captions: React.FC<{subs: Subtitle[]; f: number; style: Style; w: number; h: number}> = ({subs, f, style, w, h}) => {
  const cur = subs.find((s) => f >= s.start && f < s.end);
  if (!cur) return null;
  const t = f - cur.start;
  const pop = ease('back', t / 5);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: h * style.subtitle.y, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: style.fonts.subtitle, fontSize: style.subtitle.size, color: style.subtitle.color, textAlign: 'center', lineHeight: 1.15, maxWidth: w - 120,
        WebkitTextStroke: `${Math.round(style.subtitle.size / 7)}px ${style.subtitle.stroke}`, paintOrder: 'stroke fill', transform: `scale(${0.85 + 0.15 * pop})`}}>
        {cur.text}
      </div>
    </div>
  );
};

// motor de escena por plano: 'auto' usa @react-three/fiber solo donde aporta (efectos 3D o luces de neón)
const FX3D = new Set(['impact', 'sparks', 'confetti']);
const use3D = (spec: EpisodeSpec, s: Shot) => {
  const e = spec.style.engine ?? 'css';
  if (e === 'r3f') return true;
  if (e !== 'auto') return false;
  return !!s.lighting || (s.effects ?? []).some((x) => FX3D.has(x.type));
};

export const Episode: React.FC<{spec: EpisodeSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  useFonts(spec.style);
  const {width: W, height: H} = spec.meta;
  const shots = spec.shots;
  // plano actual + el anterior si hay transición en curso
  const idx = shots.findIndex((s) => frame >= s.start && frame < s.start + s.dur);
  const visible: Shot[] = [];
  if (idx >= 0) {
    const cur = shots[idx];
    const local = frame - cur.start;
    if (idx > 0 && cur.transitionIn && cur.transitionIn.type !== 'cut' && local < cur.transitionIn.dur) visible.push(shots[idx - 1]);
    visible.push(cur);
  }
  return (
    <AbsoluteFill style={{background: spec.style.palette.ink ?? '#000', ['--font-title' as string]: spec.style.fonts.title}}>
      <Defs style={spec.style} f={frame} />
      {visible.map((s, i) => {
        const local = frame - s.start;
        const isIncoming = i === visible.length - 1;
        return (
          <AbsoluteFill key={s.id} style={isIncoming ? transitionStyle(s, local, W, H) : {}}>
            {s.kind === 'title' || s.kind === 'end' ? <TitleCard shot={s} f={local} style={spec.style} w={W} h={H} /> : use3D(spec, s) ? <SceneView3D spec={spec} shot={s} f={local} /> : <SceneView spec={spec} shot={s} f={local} />}
          </AbsoluteFill>
        );
      })}
      <Overlay style={spec.style} w={W} h={H} />
      <Captions subs={spec.subtitles} f={frame} style={spec.style} w={W} h={H} />
    </AbsoluteFill>
  );
};
