<template>
  <div class="idle">
    <div class="idle__inner">
      <span class="wordmark idle__title">Zapette</span>
      <span class="label-cond idle__hint">En attente de la télécommande…</span>
    </div>
  </div>
</template>

<style scoped>
.idle {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.idle__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: rise-in 0.4s var(--ease-panel) both;
}

.idle__title {
  font-size: clamp(64px, 12vw, 140px);
  color: var(--color-ink-50);
}

.idle__hint {
  color: var(--color-tally-500);
}
</style>
