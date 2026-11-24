const POSE_SIZES = {
  wave: [267, 291],
  giggle: [289, 290],
  peek: [313, 187],
  star: [275, 293],
  curious: [278, 282],
  surprised: [236, 284],
  sleep: [270, 243],
  cheer: [271, 264],
  cry: [232, 229],
  map: [267, 266],
  hurry: [256, 220],
  shy: [226, 248],
  look: [280, 264],
  love: [247, 276],
} as const;

export type MascotPose = keyof typeof POSE_SIZES;

export function Mascot(props: { pose: MascotPose; class?: string }) {
  return (
    <img
      src={`/mascot/${props.pose}.webp`}
      width={POSE_SIZES[props.pose][0]}
      height={POSE_SIZES[props.pose][1]}
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
      class={["pointer-events-none h-auto shrink-0 select-none", props.class]}
    />
  );
}
