import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonContent, IonHeader, IonIcon, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline } from 'ionicons/icons';
import { Observable, finalize } from 'rxjs';
import { AccionAdmin, AutorizacionMenor, EstadoUsuario, Parentesco, Rol, Usuario } from '../core/models/api.models';
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
            <ion-icon name="add-outline" aria-hidden="true"></ion-icon>&nbsp;{{ formAbierto() ? 'Cerrar' : 'Crear cuenta' }}
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

        @if (autorizando(); as u) {
          <section class="tarjeta formulario" aria-labelledby="titulo-autorizacion">
            <p class="titulo-seccion" id="titulo-autorizacion">Autorización del representante legal · {{ u.nombres }} {{ u.apellidos }}</p>
            @if (autorizacion(); as a) {
              <p>
                <span class="chip" [class]="claseEstado(a.estado)">{{ etiqueta(a.estado) }}</span>
                {{ a.nombreRepresentante }} ({{ etiqueta(a.parentesco) }}) · {{ a.correoRepresentante }}
                @if (a.canal) { · por {{ a.canal === 'CORREO' ? 'correo' : 'documento firmado' }} }
                @if (a.fechaRespuesta) { · {{ fechaLarga(a.fechaRespuesta) }} }
              </p>
              @if (a.soporte) { <p class="texto-tenue">Soporte: {{ a.soporte }}</p> }
            } @else {
              <p class="texto-tenue">Esta cuenta no tiene una autorización registrada.</p>
            }
            @if (autorizacion()?.estado === 'AUTORIZADA') {
              <button type="button" class="btn-chico btn-peligro" [disabled]="trabajando()" (click)="revocar(u)">Revocar autorización</button>
            } @else {
              <form [formGroup]="firmada" (ngSubmit)="registrarAutorizacion(u)" novalidate class="formulario">
                <p class="texto-suave">Registra aquí una autorización firmada por la madre, el padre o el tutor (Ley 1581, Decreto 1377 art. 12). Guarda el documento y escribe dónde quedó.</p>
                <div class="campos campos--2">
                  <div class="field"><label class="field__label" for="a1">Nombre del representante</label>
                    <div class="field__box"><input id="a1" formControlName="nombreRepresentante" maxlength="160" /></div></div>
                  <div class="field"><label class="field__label" for="a2">Correo del representante</label>
                    <div class="field__box"><input id="a2" type="email" formControlName="correoRepresentante" /></div></div>
                  <div class="field"><label class="field__label" for="a3">Parentesco</label>
                    <div class="field__box"><select id="a3" formControlName="parentesco">
                      <option value="MADRE">Madre</option><option value="PADRE">Padre</option><option value="TUTOR_LEGAL">Tutor o representante legal</option>
                    </select></div></div>
                  @if (!u.fechaNacimiento) {
                    <div class="field"><label class="field__label" for="a5">Fecha de nacimiento del titular</label>
                      <div class="field__box"><input id="a5" type="date" formControlName="fechaNacimiento" /></div></div>
                  }
                </div>
                <div class="field"><label class="field__label" for="a4">Soporte (qué documento es y dónde está guardado)</label>
                  <div class="field__box"><input id="a4" formControlName="soporte" maxlength="300" placeholder="Autorización firmada el 10/11/2026, escaneada en Drive/Kinet/Autorizaciones" /></div></div>
                <div class="acciones">
                  <button type="submit" class="btn-primary" [disabled]="trabajando()">Registrar autorización</button>
                  <button type="button" class="btn-secundario" (click)="cerrarAutorizacion()">Cerrar</button>
                </div>
              </form>
            }
          </section>
        }

        <form class="tarjeta filtros" (ngSubmit)="buscar()">
          <div class="campos campos--2">
            <div class="field">
              <label class="field__label" for="f1">Buscar por correo</label>
              <div class="field__box"><ion-icon name="search-outline" aria-hidden="true"></ion-icon>
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
                    @if (u.menorDeEdad) { <br /><span class="chip chip--aviso">Menor de edad</span> }
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
                        @if (u.estado === 'PENDIENTE') { <option value="PENDIENTE" disabled>Pendiente</option> }
                      </select>
                    </div>
                  </td>
                  <td class="oculta-movil">{{ fechaLarga(u.fechaRegistro) }}</td>
                  <td>
                    @if (u.rol === 'JUGADOR') {
                      <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="ajustarXp(u)">Ajustar XP</button>
                    }
                    @if (u.menorDeEdad || u.estado === 'PENDIENTE') {
                      <button type="button" class="btn-chico" [disabled]="trabajando()" (click)="abrirAutorizacion(u)">Autorización</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pie-lista [lista]="lista" vacio="No se encontraron cuentas." />
        </div>

        <h2 class="titulo-seccion">Bitácora de acciones administrativas</h2>
        <p class="texto-suave bitacora-lead">Cada cambio de estado o de rol, cada cuenta creada y cada ajuste de XP queda registrado. No se puede editar ni borrar.</p>
        <div class="tarjeta tabla-scroll">
          <table class="tabla">
            <thead>
              <tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Cuenta</th><th>Cambio</th></tr>
            </thead>
            <tbody>
              @for (a of bitacora.items(); track a.id) {
                <tr>
                  <td>{{ fechaLarga(a.fecha) }}</td>
                  <td>{{ a.correoActor }}</td>
                  <td>{{ etiqueta(a.accion) }}</td>
                  <td>{{ a.correoAfectado ?? '—' }}</td>
                  <td>{{ detalleAccion(a) }}</td>
                </tr>
              }
            </tbody>
          </table>
          <app-pie-lista [lista]="bitacora" vacio="Todavía no hay acciones registradas." />
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .nueva { width: auto; padding: 0 18px; }
    .bitacora-lead { margin: -4px 0 12px; }
    .formulario, .filtros { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
    .celda { height: 40px; padding: 0 8px; min-width: 130px; }
    .celda select { font-size: 14px; }
    .acciones { display: flex; gap: 10px; flex-wrap: wrap; }
    .acciones button { width: auto; padding: 0 18px; }
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
  /** Bitácora: quién cambió qué y cuándo (auditoría 03/11/2026). */
  bitacora = new ListaPaginada<AccionAdmin>((p, t) => this.staff.bitacora(p, t), 10);
  miId = () => this.auth.usuario()?.id ?? -1;

  formAbierto = signal(false);
  /** RN-33: cuenta de un menor cuya autorización se está viendo o registrando. */
  autorizando = signal<Usuario | null>(null);
  autorizacion = signal<AutorizacionMenor | null>(null);
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

  firmada = this.fb.nonNullable.group({
    nombreRepresentante: ['', [Validators.required, Validators.maxLength(160)]],
    correoRepresentante: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    parentesco: ['MADRE' as Parentesco, Validators.required],
    soporte: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]],
    fechaNacimiento: [''],
  });

  etiqueta = etiqueta;
  claseEstado = claseEstado;
  fechaLarga = fechaLarga;

  constructor() {
    addIcons({ addOutline, searchOutline });
  }

  ionViewWillEnter(): void {
    this.lista.recargar();
    this.bitacora.recargar();
  }

  /** "Bloqueado → Activo", "Jugador → Entrenador" o el detalle del ajuste. */
  detalleAccion(a: AccionAdmin): string {
    if (a.accion === 'AJUSTE_XP' || a.accion === 'AUTORIZACION_MENOR') return a.valorNuevo ?? '—';
    if (a.accion === 'CREACION_CUENTA') return `Rol: ${etiqueta(a.valorNuevo)}`;
    return `${etiqueta(a.valorAnterior)} → ${etiqueta(a.valorNuevo)}`;
  }

  abrirAutorizacion(u: Usuario): void {
    this.autorizando.set(u);
    this.autorizacion.set(null);
    this.firmada.reset({ parentesco: 'MADRE' });
    this.staff.autorizacionMenor(u.id).subscribe({
      next: a => {
        this.autorizacion.set(a);
        this.firmada.patchValue({ nombreRepresentante: a.nombreRepresentante, correoRepresentante: a.correoRepresentante, parentesco: a.parentesco });
      },
      error: () => this.autorizacion.set(null), // 404: todavía no hay ninguna
    });
  }

  cerrarAutorizacion(): void {
    this.autorizando.set(null);
    this.autorizacion.set(null);
  }

  registrarAutorizacion(u: Usuario): void {
    if (this.firmada.invalid) {
      this.firmada.markAllAsTouched();
      this.error.set('Revisa los datos: nombre, correo y parentesco del representante, y un soporte de al menos 10 caracteres.');
      return;
    }
    const v = this.firmada.getRawValue();
    this.ejecutar(this.staff.registrarAutorizacion(u.id, {
      nombreRepresentante: v.nombreRepresentante.trim(), correoRepresentante: v.correoRepresentante.trim(),
      parentesco: v.parentesco, soporte: v.soporte.trim(), ...(v.fechaNacimiento ? { fechaNacimiento: v.fechaNacimiento } : {}),
    }), () => `Autorización registrada: la cuenta de ${u.correo} quedó activa.`, () => {
      this.cerrarAutorizacion();
      this.lista.recargar();
    });
  }

  async revocar(u: Usuario): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Revocar la autorización',
      message: 'La cuenta quedará inactiva. Escribe el motivo (queda en la bitácora).',
      inputs: [{ name: 'motivo', type: 'text', placeholder: 'Motivo', attributes: { maxlength: 150 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Revocar', role: 'confirm', handler: (d: { motivo: string }) => (d.motivo?.trim().length ?? 0) >= 5 },
      ],
    });
    await alerta.present();
    const { role, data } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;
    this.ejecutar(this.staff.revocarAutorizacion(u.id, (data.values as { motivo: string }).motivo.trim()),
      () => `Autorización revocada: la cuenta de ${u.correo} quedó inactiva.`, () => {
        this.cerrarAutorizacion();
        this.lista.recargar();
      });
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
    this.ejecutar(this.staff.crearCuenta(this.nueva.getRawValue()),
      u => `Cuenta de ${u.correo} creada como ${etiqueta(u.rol)}. Al entrar por primera vez deberá aceptar la política de datos.`, () => {
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
        this.bitacora.recargar();
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.lista.recargar(); // devuelve los selectores al valor real
      },
    });
  }
}
