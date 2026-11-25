// dialogo-confirmacion.component.ts
//
// Modal central de advertencia para acciones que no se pueden deshacer. Se monta una vez
// en app.html y muestra lo que pida ConfirmacionService. Usa <dialog> nativo: queda
// centrado, encima de todo, atrapa el foco del teclado y se cierra con Esc.
import { Component, ElementRef, Injector, afterNextRender, effect, inject, viewChild } from '@angular/core';
import { ConfirmacionService } from '../services/confirmacion.service';

@Component({
  selector: 'app-dialogo-confirmacion',
  standalone: true,
  template: `
    <dialog
      #dialogo
      aria-labelledby="confirmacion-titulo"
      aria-describedby="confirmacion-mensaje"
      class="m-auto w-[min(400px,calc(100%-32px))] rounded-3xl border-0 bg-white p-0 font-sans text-tinta shadow-[0_20px_60px_rgba(29,36,32,.3)] backdrop:bg-tinta/50"
      (cancel)="$event.preventDefault(); confirmacion.responder(false)"
      (click)="alTocarFondo($event, dialogo)"
    >
      @if (confirmacion.actual(); as pedido) {
        <div class="flex flex-col items-center gap-4 px-6 pt-7 pb-6 text-center">
          <span aria-hidden="true" class="flex size-14 items-center justify-center rounded-full bg-[#F8DADA]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9E1C1C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.3 3.9L1.8 18.6a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"></path>
              <path d="M12 9.5v4.5M12 17.5v.01"></path>
            </svg>
          </span>
          <div class="flex flex-col gap-2">
            <h2 id="confirmacion-titulo" class="m-0 font-sans text-[20px] leading-tight font-bold tracking-[-0.01em]">
              {{ pedido.titulo }}
            </h2>
            <p id="confirmacion-mensaje" class="m-0 text-[15px] leading-[1.45] text-apagado">{{ pedido.mensaje }}</p>
            <p class="m-0 text-[13px] font-bold text-[#8E1A1A]">Esta acción no se puede deshacer.</p>
          </div>
          <div class="mt-1 grid w-full grid-cols-2 gap-2.5">
            <!-- Cancelar primero y con el foco: lo seguro es lo que pasa con Enter. -->
            <button
              #cancelar
              type="button"
              class="h-12 cursor-pointer rounded-2xl border-[1.5px] border-solid border-[#CFCBC1] bg-white text-[15px] font-bold text-tinta hover:bg-superficie"
              (click)="confirmacion.responder(false)"
            >
              {{ pedido.textoCancelar ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="h-12 cursor-pointer rounded-2xl border-0 bg-[#9E1C1C] text-[15px] font-bold text-white hover:bg-[#7F1616]"
              (click)="confirmacion.responder(true)"
            >
              {{ pedido.textoConfirmar ?? 'Eliminar' }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class DialogoConfirmacionComponent {
  protected readonly confirmacion = inject(ConfirmacionService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly cancelar = viewChild<ElementRef<HTMLButtonElement>>('cancelar');
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const abierto = this.confirmacion.actual() !== null;
      const dialogo = this.dialogo().nativeElement;
      if (abierto && !dialogo.open) {
        dialogo.showModal();
        // El contenido se dibuja después de abrir: recién ahí se puede enfocar "Cancelar".
        afterNextRender(() => this.cancelar()?.nativeElement.focus(), { injector: this.injector });
      }
      if (!abierto && dialogo.open) dialogo.close();
    });
  }

  /** Un click directo sobre el <dialog> (no sobre su contenido) es un click en el fondo oscuro. */
  protected alTocarFondo(evento: MouseEvent, dialogo: HTMLDialogElement): void {
    if (evento.target === dialogo) this.confirmacion.responder(false);
  }
}
