import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-barra-progreso',
  template: `
    <div class="pista" role="progressbar"
         aria-valuemin="0" [attr.aria-valuenow]="valor()" [attr.aria-valuemax]="meta()">
      <div class="barra" [class.barra--completa]="completado()" [style.width.%]="porcentaje()"></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .pista {
      height: 6px;
      overflow: hidden;
      border-radius: var(--kinet-radius-pill);
      background: var(--kinet-surface-high);
    }
    .barra {
      height: 100%;
      border-radius: var(--kinet-radius-pill);
      background: linear-gradient(90deg, var(--kinet-primary), var(--kinet-accent));
      transition: width 0.4s ease;
    }
    .barra--completa {
      background: var(--kinet-accent);
      box-shadow: var(--kinet-glow);
    }
  `,
})
export class BarraProgresoComponent {
  valor = input.required<number>();
  meta = input.required<number>();
  completado = input(false);

  porcentaje = computed(() => (this.meta() > 0 ? Math.min(100, (this.valor() / this.meta()) * 100) : 0));
}
