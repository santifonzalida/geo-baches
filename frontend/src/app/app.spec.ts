import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the map at the root route', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.tagName.toLowerCase()).toBe('app-mapa');
  });

  it('should render the admin panel at /admin/pendientes', async () => {
    const harness = await RouterTestingHarness.create('/admin/pendientes');
    expect(harness.routeNativeElement?.tagName.toLowerCase()).toBe('app-admin-pendientes');
  });
});
