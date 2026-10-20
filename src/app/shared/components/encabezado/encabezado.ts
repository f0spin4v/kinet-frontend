import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, notificationsOutline, personOutline, triangle } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth';
import { iniciales } from '../../../core/utils/texto';

@Component({
  selector: 'app-encabezado',
  templateUrl: './encabezado.html',
  styleUrls: ['./encabezado.scss'],
  imports: [IonIcon, RouterLink],
})
export class EncabezadoComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private elemento = inject(ElementRef<HTMLElement>);

  iniciales = computed(() => iniciales(this.auth.nombreCompleto()));
  nombre = this.auth.nombreCompleto;
  correo = computed(() => this.auth.usuario()?.correo ?? '');
  esJugador = this.auth.esJugador;
  rutaPerfil = computed(() => (this.auth.esJugador() ? '/tabs/perfil' : '/staff/perfil'));
  abierto = signal(false);
  arriba = signal(60);
  derecha = signal(16);
  private boton = viewChild.required<ElementRef<HTMLElement>>('boton');
  private panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    addIcons({ triangle, notificationsOutline, personOutline, logOutOutline });
  }

  ngAfterViewInit(): void {
    document.body.appendChild(this.panel().nativeElement);
  }

  ngOnDestroy(): void {
    this.panel().nativeElement.remove();
  }

  alternar(evento: Event): void {
    evento.stopPropagation();
    if (!this.abierto()) this.colocar();
    this.abierto.update(a => !a);
  }

  /** Coloca el panel justo debajo del botón, alineado a su borde derecho. */
  private colocar(): void {
    const r = this.boton().nativeElement.getBoundingClientRect();
    this.arriba.set(Math.round(r.bottom + 10));
    this.derecha.set(Math.max(8, Math.round(window.innerWidth - r.right)));
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  async cerrarSesion(): Promise<void> {
    this.cerrar();
    await this.auth.cerrarSesion();
    this.nav.navigateRoot('/login');
  }

  /** Un clic fuera del menú o la tecla Escape lo cierran. */
  @HostListener('document:click', ['$event'])
  clicFuera(evento: Event): void {
    const dentro = this.elemento.nativeElement.contains(evento.target) || this.panel().nativeElement.contains(evento.target as Node);
    if (this.abierto() && !dentro) this.cerrar();
  }

  @HostListener('window:resize')
  alRedimensionar(): void {
    this.cerrar();
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    this.cerrar();
  }
}
