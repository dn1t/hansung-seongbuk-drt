export function DemoNotice(props: { class?: string }) {
  return (
    <aside
      aria-label="데모 안내"
      class={["flex items-start gap-x-3 rounded-2xl border border-sand-4 bg-sand-2 px-4 py-3.5", props.class]}
    >
      <span class="mt-px shrink-0 rounded-md bg-amber-3 px-1.5 text-xs leading-5 font-bold text-amber-11">데모</span>
      <p class="text-sm leading-5 font-medium break-keep text-sand-11">
        <b class="font-semibold text-sand-12">실제로 운영하는 서비스가 아니에요.</b> 발표와 시연을 위한 데모라서
        신청해도 버스가 오지 않아요.
      </p>
    </aside>
  );
}
