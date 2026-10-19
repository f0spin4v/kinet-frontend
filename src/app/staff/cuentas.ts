import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonContent, IonHeader, IonIcon, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import { EstadoUsuario, Rol, Usuario } from '../core/models/api.models';
import { AuthService } from '../core/services/auth';
import { StaffService } from '../core/services/staff';
import { claseEstado, etiqueta, fechaLarga } from '../core/utils/formato';
import { mensajeDeError } from '../core/utils/http-error';
import { ListaPaginada } from '../core/utils/lista-paginada';
import { RefrescarComponent } from '../shared/components/refrescar/refrescar';
import { EncabezadoComponent } from '../shared/components/encabezado/encabezado';
import { PieListaComponent } from '../shared/components/pie-lista/pie-lista';

/** Cuentas (administrador): buscar, cambiar estado o rol, ajustar XP y crear cuentas de cualquier rol. */
@Component({
  selector: 'app-cuentas',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, FormsModule, ReactiveFormsModule, EncabezadoComponent, RefrescarComponent, PieListaComponent],
  template: `
    <ion-header [translucent]="true" class="ion-no-border">
      <ion-toolbar class="toolbar-kinet"><app-encabezado></app-encabezado></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="pagina">
        <div class="titulo-pagina">
          <app-refrescar (refrescar)="buscar()" />
          <div>
            <p class="eyebrow"><span class="punto"></span>Administración</p>
            <h1>Cuentas</h1>
            <p class="titulo-pagina__lead">Soporte de usuarios: estado, rol y ajustes de XP.</p>
          </div>
          <button type="button" class="btn-primary nueva" (click)="formAbierto.set(!formAbierto())">
            <ion-icon name="add-outline"></ion-icon>&nbsp;{{ formAbierto() ? 'Cerrar' : 'Crear cuenta' }}
          </button>
        </div>

        @if (formAbierto()) {
          <form class="tarjeta formulario" [formGroup]="nueva" (ngSubmit)="crear()" novalidate>
            <p class="titulo-seccion">Nueva cuenta</p>
            <div class="campos campos--2">
              <div class="field"><label class="field__label" for="n1">Nombres</label>
                <div class="field__box"><input id="n1" formControlName="nombres" maxlength="80" /></div></div>
              <div class="field"><label class="field__label" for="n2">Apellidos</label>
                <div class="field__box"><input id="n2" formControlName="apellidos" maxlength="80" /></div></div>
              <div class="field"><label class="field__label" for="n3">Correo</label>
                <div class="field__box"><input id="n3" type="email" formControlName="correo" /></div></div>
              <div class="field"><label class="field__label" for="n4">Gamertag</label>
                <div class="field__box"><input id="n4" formControlName="gamertag" maxlength="30" autocapitalize="off" /></div></div>
              <div class="field"><label class="field__label" for="n5">Contraseña</label>
                <div class="field__box"><input id="n5" type="text" formControlName="contrasena" /></div>
                <span class="field__hint">8 o más caracteres, con una letra y un número.</span></div>
              <div class="field"><label class="field__label" for="n6">Rol</label>
                <div class="field__box"><select id="n6" formControlName="rol">
                  @for (r of roles; track r) { <option [value]="r">{{ etiqueta(r) }}</option> }
                </select></div></div>
            </div>
            <button type="submit" class="btn-primary" [disabled]="trabajando()">Crear cuenta</button>
          </form>
        }

        <form class="tarjeta filtros" (ngSubmit)="buscar()">
          <div class="campos campos--2">
            <div class="field">
              <label class="field__label" for="f1">Buscar por correo</label>
              <div class="field__box"><ion-icon name="search-outline"></ion-icon>
                <input id="f1" name="correo" [(ngModel)]="correo" placeholder="laura@kinet.com" /></div>
            </div>
            <div class="field">
              <label class="field__label" for="f2">Estado</label>
              <div class="field__box"><select id="f2" name="estado" [(ngModel)]="estado" (change)="buscar()">
                <option value="">Todos</option>
                @for (e of estados; track e) { <option [value]="e">{{ etiqueta(e) }}</option> }
              </select></div>
            </div>
          </div>
          <button type="submit" class="btn-secundario">Buscar</button>
        </form>

        @if (error()) { <p class="alert-error" role="alert">{{ error() }}</p> }
        @if (ok()) { <p class="aviso-ok" role="status">{{ ok() }}</p> }

        <div class="tarjeta tabla-scroll">
          <table class="tabla">
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th class="oculta-movil">Registro</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (u of lista.items(); track u.id) {
                <tr>
                  <td>
                    <strong>{{ u.nombres }} {{ u.apellidos }}</strong><br />
                    <span class="texto-tenue">{{ u.correo }}@if (u.gamertag) { · &#64;{{ u.gamertag }} }</span>
                  </td>
                  <td>
                    <div class="field__box celda">
                      <select [ngModel]="u.rol" [disabled]="u.id === miId() || trabajando()" (ngModelChange)="cambiarRol(u, $event)"
                              [attr.aria-label]="'Rol de ' + u.correo" name="rol{{ u.id }}">
                        @for (r of roles; track r) { <option [value]="r">{{ etiqueta(r) }}</option> }
                      </select>
                    </div>
                  </td>
                  <td>
                    <div class="field__box celda">
                      <select [ngModel]="u.estado" [disabled]="u.id === miId() || trabajando()" (ngModelChange)="cambiarEstado(u, $event)"
                              [attr.aria-label]="'Estado de ' + u.correo" name="estado{{ u.id }}">
                        @for (e of estados; track e) { <option [value]="e">{{ etiqueta(e) }}</option> }
                      </select>
                    </div>
                  </td>
                  <td class="oculta-movil">{{ fechaLarga(u.fechaRegistro) }}</td>
                  <td>
                    @if (u.rol === 'JUGADOR') {
                      <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="ajustarXp(u)">Ajustar XP</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pie-lista [lista]="lista" vacio="No se encontraron cuentas." />
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .nueva { width: auto; padding: 0 18px; }
    .formulario, .filtros { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .celda { height: 40px; padding: 0 8px; min-width: 130px; }
    .celda select { font-size: 14px; }
    .oculta-movil { display: none; }
    @media (min-width: 768px) { .oculta-movil { display: table-cell; } }
  `,
})
export class CuentasPage implements ViewWillEnter {
  private staff = inject(StaffService);
  private auth = inject(AuthService);
  private alertas = inject(AlertController);
  private fb = inject(FormBuilder);

  readonly roles: Rol[] = ['JUGADOR', 'ENTRENADOR', 'ADMINISTRADOR'];
  readonly estados: EstadoUsuario[] = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'];

  correo = '';
  estado: EstadoUsuario | '' = '';
  lista = new ListaPaginada<Usuario>((p, t) => this.staff.usuarios(this.correo.trim(), this.estado, p, t), 15);
  miId = () => this.auth.usuario()?.id ?? -1;

  formAbierto = signal(false);
  trabajando = signal(false);
  error = signal<string | null>(null);
  ok = signal<string | null>(null);

  nueva = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(80)]],
    correo: ['', [Validators.required, Validators.email]],
    gamertag: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    rol: ['JUGADOR' as Rol],
  });

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;

  constructor() {
    addIcons({ addOutline, searchOutline });
  }

  ionViewWillEnter(): void {
    this.lista.recargar();
  }

  buscar(): void {
    this.lista.recargar();
  }

  crear(): void {
    if (this.nueva.invalid) {
      this.nueva.markAllAsTouched();
      this.error.set('Revisa los datos: todos son obligatorios, la contraseña necesita 8 caracteres con letra y número.');
      return;
    }
    const { rol, ...resto } = this.nueva.getRawValue();
    this.ejecutar(this.staff.crearCuenta({ ...resto, fechaNacimiento: null, aceptaPolitica: true }, rol),
      u => `Cuenta de ${u.correo} creada como ${etiqueta(u.rol)}.`, () => {
        this.nueva.reset({ rol: 'JUGADOR' });
        this.formAbierto.set(false);
        this.lista.recargar();
      });
  }

  cambiarRol(u: Usuario, rol: Rol): void {
    this.ejecutar(this.staff.cambiarRol(u.id, rol), x => `${x.correo} ahora es ${etiqueta(x.rol)}.`,
      () => this.lista.recargar());
  }

  cambiarEstado(u: Usuario, estado: EstadoUsuario): void {
    this.ejecutar(this.staff.cambiarEstado(u.id, estado), x => `${x.correo}: ${etiqueta(x.estado)}.`,
      () => this.lista.recargar());
  }

  async ajustarXp(u: Usuario): Promise<void> {
    const alerta = await this.alertas.create({
      header: `Ajustar XP de ${u.gamertag ?? u.correo}`,
      message: 'Usa un número negativo para restar.',
      inputs: [
        { name: 'cantidad', type: 'number', placeholder: 'Cantidad (-10000 a 10000)' },
        { name: 'motivo', type: 'text', placeholder: 'Motivo (obligatorio)', attributes: { maxlength: 200 } },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aplicar', role: 'confirm', handler: (d: { cantidad: string; motivo: string }) => !!d.motivo?.trim() && Number(d.cantidad) !== 0 && !isNaN(Number(d.cantidad)) },
      ],
    });
    await alerta.present();
    const { role, data } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;
    const { cantidad, motivo } = data.values as { cantidad: string; motivo: string };
    this.ejecutar(this.staff.ajustarXp(u.id, Number(cantidad), motivo.trim()),
      m => `Se ajustaron ${m.cantidad} XP a ${u.gamertag ?? u.correo}.`, () => undefined);
  }

  private ejecutar<T>(peticion: Observable<T>, mensaje: (r: T) => string, despues: () => void): void {
    this.trabajando.set(true);
    this.error.set(null);
    this.ok.set(null);
    peticion.pipe(finalize(() => this.trabajando.set(false))).subscribe({
      next: r => {
        this.ok.set(mensaje(r));
        despues();
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.lista.recargar(); // devuelve los selectores al valor real
      },
    });
  }
}
