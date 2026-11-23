import {forkJoin,catchError,of} from 'rxjs';
import {NotificationManagementService} from '../../pages/academy-management/services/notification-management.service';
import {GradingManagementService} from '../../pages/academy-management/services/grading-management.service';
import { Injectable } from '@angular/core';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { NavigationItem } from './navigation-item.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
import { AuthService } from '../auth/auth.service';
import { canAccessRoute } from '../auth/route-access';

@Injectable({
  providedIn: 'root'
})
export class NavigationLoaderService {
  private readonly _items: BehaviorSubject<NavigationItem[]> =
    new BehaviorSubject<NavigationItem[]>([]);

  get items$(): Observable<NavigationItem[]> {
    return this._items.asObservable();
  }

  constructor(
    private readonly layoutService: VexLayoutService,
    private readonly languageService: LanguageService,
    private readonly grading: GradingManagementService,
    private readonly authService: AuthService,
    private readonly notificationService:NotificationManagementService
  ) {
    this.languageService.language$.subscribe(() => this.loadNavigation());
    this.authService.currentUser$.subscribe(() => this.loadNavigation());
  }

  loadNavigation(): void {
    const academyId = this.authService.getCurrentUser()?.academieId ?? 0;
    const academyRoute = (suffix: string) =>
      academyId
        ? `/academies/${academyId}/${suffix}`
        : '/academia/dojo-escuela';
    const items: NavigationItem[] = [
      {
        type: 'subheading',
        label: 'Campeonatos',
        children: [
          {
            type: 'link',
            label: 'Invitaciones',
            route: '/campeonatos/invitaciones',
            icon: 'mat:mail'
          },
          {
            type: 'link',
            label: 'Mis Eventos',
            route: '/campeonatos/mis-eventos',
            icon: 'mat:emoji_events'
          },
          {
            type: 'link',
            label: 'Cronograma',
            route: '/campeonatos/cronograma',
            icon: 'mat:schedule'
          },
          {
            type: 'dropdown',
            label: 'Desarrollo Evento',
            icon: 'mat:scoreboard',
            children: [
              { type: 'link', label: 'Mesa de control', route: '/scoreboard/control-tables' },
              { type: 'link', label: 'Medallero Olímpico', route: '/medallero', icon: 'mat:emoji_events' }
            ]
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Academia',
        children: [
          {
            type: 'link',
            label: 'Dashboard',
            route: '/academia/dashboard',
            icon: 'mat:dashboard'
          },
          {
            type: 'dropdown',
            label: 'Gestión de clases',
            icon: 'mat:school',
            children: [
              { type: 'link', label: 'Clases', route: academyRoute('classes') },
              { type: 'link', label: 'Sesiones', route: academyRoute('class-sessions') },
              { type: 'link', label: 'Asistencia', route: academyRoute('attendance') },
              { type: 'link', label: 'Calendario', route: academyRoute('calendar') },
              {
                type: 'link',
                label: 'Modalidades',
                route: academyRoute('training-modalities')
              },
              { type: 'link', label: 'Salas', route: academyRoute('rooms') },
              {
                type: 'link',
                label: 'Instructores',
                route: academyRoute('instructors')
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Finanzas',
            icon: 'mat:payments',
            children: [
              {
                type: 'link',
                label: 'Panel financiero',
                route: academyRoute('billing')
              },
              {
                type: 'link',
                label: 'Planes / Membresías',
                route: academyRoute('billing-plans')
              },
              { type: 'link', label: 'Cargos', route: academyRoute('charges') },
              { type: 'link', label: 'Pagos', route: academyRoute('payments') },
              { type: 'link', label: 'Morosidad', route: academyRoute('overdue') }
            ]
          },
          {
            type: 'dropdown',
            label: 'Grados',
            icon: 'mat:military_tech',
            children: [
              { type: 'link', label: 'Estilos', route: academyRoute('styles') },
              {
                type: 'link',
                label: 'Sistemas de grado',
                route: academyRoute('grading')
              }
            ]
          },
          {
            type: 'link',
            label: 'Notificaciones',
            route: academyRoute('notifications'),
            icon: 'mat:notifications'
          },
          {
            type: 'link',
            label: 'Dojo/Escuela',
            route: '/academia/dojo-escuela',
            icon: 'mat:edit_square'
          },
          {
            type: 'link',
            label: 'Instructor/Sensei',
            route: () =>
              window.location.assign(
                'https://budotournaments.net/app/pages/instructor/'
              ),
            icon: 'mat:person'
          },
          {
            type: 'link',
            label: 'Deportistas/Coach',
            route: '/campeonatos/deportistas',
            icon: 'mat:assignment'
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Dashboards',
        children: [
          {
            type: 'link',
            label: 'Analytics',
            route: '/',
            icon: 'mat:insights',
            routerLinkActiveOptions: { exact: true }
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Apps',
        children: [
          {
            type: 'link',
            label: 'All-In-One Table',
            route: '/apps/aio-table',
            icon: 'mat:assignment'
          },
          {
            type: 'dropdown',
            label: 'Help Center',
            icon: 'mat:contact_support',
            children: [
              {
                type: 'link',
                label: 'Getting Started',
                route: '/apps/help-center/getting-started'
              },
              {
                type: 'link',
                label: 'Pricing & Plans',
                route: '/apps/help-center/pricing'
              },
              {
                type: 'link',
                label: 'FAQ',
                route: '/apps/help-center/faq'
              },
              {
                type: 'link',
                label: 'Guides',
                route: '/apps/help-center/guides'
              }
            ]
          },
          {
            type: 'link',
            label: 'Calendar',
            route: '/apps/calendar',
            icon: 'mat:date_range',
            badge: {
              value: '12',
              bgClass: 'bg-purple-600',
              textClass: 'text-white'
            }
          },
          {
            type: 'link',
            label: 'Chat',
            route: '/apps/chat',
            icon: 'mat:chat',
            badge: {
              value: '16',
              bgClass: 'bg-cyan-600',
              textClass: 'text-white'
            }
          },
          {
            type: 'link',
            label: 'Mailbox',
            route: '/apps/mail',
            icon: 'mat:mail'
          },
          {
            type: 'dropdown',
            label: 'Social',
            icon: 'mat:person_outline',
            children: [
              {
                type: 'link',
                label: 'Profile',
                route: '/apps/social',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Timeline',
                route: '/apps/social/timeline'
              }
            ]
          },
          {
            type: 'link',
            label: 'WYSIWYG Editor',
            route: '/apps/editor',
            icon: 'mat:chrome_reader_mode'
          },
          {
            type: 'dropdown',
            label: 'Contacts',
            icon: 'mat:contacts',
            children: [
              {
                type: 'link',
                label: 'List - Grid',
                route: '/apps/contacts/grid'
              },
              {
                type: 'link',
                label: 'List - Table',
                route: '/apps/contacts/table'
              }
            ]
          },
          {
            type: 'link',
            label: 'Scrumboard',
            route: '/apps/scrumboard',
            icon: 'mat:assessment',
            badge: {
              value: 'NEW',
              bgClass: 'bg-primary-600',
              textClass: 'text-on-primary-600'
            }
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Pages',
        children: [
          {
            type: 'dropdown',
            label: 'Authentication',
            icon: 'mat:lock',
            children: [
              {
                type: 'link',
                label: 'Login',
                route: '/login'
              },
              {
                type: 'link',
                label: 'Register',
                route: '/register'
              },
              {
                type: 'link',
                label: 'Forgot Password',
                route: '/forgot-password'
              }
            ]
          },
          {
            type: 'link',
            label: 'Coming Soon',
            icon: 'mat:watch_later',
            route: '/coming-soon'
          },
          {
            type: 'dropdown',
            label: 'Errors',
            icon: 'mat:error',
            badge: {
              value: '4',
              bgClass: 'bg-green-600',
              textClass: 'text-white'
            },
            children: [
              {
                type: 'link',
                label: '404',
                route: '/pages/error-404'
              },
              {
                type: 'link',
                label: '500',
                route: '/pages/error-500'
              }
            ]
          },
          {
            type: 'link',
            label: 'Pricing',
            icon: 'mat:attach_money',
            route: '/pages/pricing'
          },
          {
            type: 'link',
            label: 'Invoice',
            icon: 'mat:receipt',
            route: '/pages/invoice'
          },
          {
            type: 'link',
            label: 'FAQ',
            icon: 'mat:help',
            route: '/pages/faq'
          },
          {
            type: 'link',
            label: 'Guides',
            icon: 'mat:book',
            route: '/pages/guides',
            badge: {
              value: '18',
              bgClass: 'bg-teal-600',
              textClass: 'text-white'
            }
          }
        ]
      },
      {
        type: 'subheading',
        label: 'UI Elements',
        children: [
          {
            type: 'dropdown',
            label: 'Components',
            icon: 'mat:bubble_chart',
            children: [
              {
                type: 'link',
                label: 'Overview',
                route: '/ui/components/overview'
              },
              {
                type: 'link',
                label: 'Autocomplete',
                route: '/ui/components/autocomplete'
              },
              {
                type: 'link',
                label: 'Buttons',
                route: '/ui/components/buttons'
              },
              {
                type: 'link',
                label: 'Button Group',
                route: '/ui/components/button-group'
              },
              {
                type: 'link',
                label: 'Cards',
                route: '/ui/components/cards'
              },
              {
                type: 'link',
                label: 'Checkbox',
                route: '/ui/components/checkbox'
              },
              {
                type: 'link',
                label: 'Dialogs',
                route: '/ui/components/dialogs'
              },
              {
                type: 'link',
                label: 'Grid List',
                route: '/ui/components/grid-list'
              },
              {
                type: 'link',
                label: 'Input',
                route: '/ui/components/input'
              },
              {
                type: 'link',
                label: 'Lists',
                route: '/ui/components/lists'
              },
              {
                type: 'link',
                label: 'Menu',
                route: '/ui/components/menu'
              },
              {
                type: 'link',
                label: 'Progress',
                route: '/ui/components/progress'
              },
              {
                type: 'link',
                label: 'Progress Spinner',
                route: '/ui/components/progress-spinner'
              },
              {
                type: 'link',
                label: 'Radio',
                route: '/ui/components/radio'
              },
              {
                type: 'link',
                label: 'Slide Toggle',
                route: '/ui/components/slide-toggle'
              },
              {
                type: 'link',
                label: 'Slider',
                route: '/ui/components/slider'
              },
              {
                type: 'link',
                label: 'Snack Bar',
                route: '/ui/components/snack-bar'
              },
              {
                type: 'link',
                label: 'Tooltip',
                route: '/ui/components/tooltip'
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Forms',
            icon: 'mat:format_color_text',
            children: [
              {
                type: 'link',
                label: 'Form Elements',
                route: '/ui/forms/form-elements'
              },
              {
                type: 'link',
                label: 'Form Wizard',
                route: '/ui/forms/form-wizard'
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Icons',
            icon: 'mat:star',
            children: [
              {
                type: 'link',
                label: 'Material Icons',
                route: '/ui/icons/ic'
              },
              {
                type: 'link',
                label: 'FontAwesome Icons',
                route: '/ui/icons/fa'
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Page Layouts',
            icon: 'mat:view_compact',
            children: [
              {
                type: 'dropdown',
                label: 'Card',
                children: [
                  {
                    type: 'link',
                    label: 'Default',
                    route: '/ui/page-layouts/card',
                    routerLinkActiveOptions: { exact: true }
                  },
                  {
                    type: 'link',
                    label: 'Tabbed',
                    route: '/ui/page-layouts/card/tabbed'
                  },
                  {
                    type: 'link',
                    label: 'Large Header',
                    route: '/ui/page-layouts/card/large-header',
                    routerLinkActiveOptions: { exact: true }
                  },
                  {
                    type: 'link',
                    label: 'Tabbed & Large Header',
                    route: '/ui/page-layouts/card/large-header/tabbed'
                  }
                ]
              },
              {
                type: 'dropdown',
                label: 'Simple',
                children: [
                  {
                    type: 'link',
                    label: 'Default',
                    route: '/ui/page-layouts/simple',
                    routerLinkActiveOptions: { exact: true }
                  },
                  {
                    type: 'link',
                    label: 'Tabbed',
                    route: '/ui/page-layouts/simple/tabbed'
                  },
                  {
                    type: 'link',
                    label: 'Large Header',
                    route: '/ui/page-layouts/simple/large-header',
                    routerLinkActiveOptions: { exact: true }
                  },
                  {
                    type: 'link',
                    label: 'Tabbed & Large Header',
                    route: '/ui/page-layouts/simple/large-header/tabbed'
                  }
                ]
              },
              {
                type: 'link',
                label: 'Blank',
                icon: 'mat:picture_in_picture',
                route: '/ui/page-layouts/blank'
              }
            ]
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Documentation',
        children: [
          {
            type: 'link',
            label: 'Changelog',
            route: '/documentation/changelog',
            icon: 'mat:update'
          },
          {
            type: 'dropdown',
            label: 'Getting Started',
            icon: 'mat:book',
            children: [
              {
                type: 'link',
                label: 'Introduction',
                route: '/documentation/introduction',
                fragment: 'introduction',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Folder Structure',
                route: '/documentation/folder-structure',
                fragment: 'folder-structure',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Installation',
                route: '/documentation/installation',
                fragment: 'installation',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Development Server',
                route: '/documentation/start-development-server',
                fragment: 'start-development-server',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Build for Production',
                route: '/documentation/build-for-production',
                fragment: 'build-for-production',
                routerLinkActiveOptions: { exact: true }
              }
            ]
          },
          {
            type: 'dropdown',
            label: 'Customization',
            icon: 'mat:book',
            children: [
              {
                type: 'link',
                label: 'Configuration',
                route: '/documentation/configuration',
                fragment: 'configuration',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Changing Styling',
                route: '/documentation/changing-styling-and-css-variables',
                fragment: 'changing-styling-and-css-variables',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Using Custom Colors',
                route:
                  '/documentation/using-custom-colors-for-the-primarysecondarywarn-palettes',
                fragment:
                  'using-custom-colors-for-the-primarysecondarywarn-palettes',
                routerLinkActiveOptions: { exact: true }
              },
              {
                type: 'link',
                label: 'Adding Menu Items',
                route: '/documentation/adding-menu-items',
                fragment: 'adding-menu-items',
                routerLinkActiveOptions: { exact: true }
              }
            ]
          },
          {
            type: 'link',
            label: 'Further Help',
            icon: 'mat:book',
            route: '/documentation/further-help',
            fragment: 'further-help',
            routerLinkActiveOptions: { exact: true }
          }
        ]
      },
      {
        type: 'subheading',
        label: 'Customize',
        children: []
      },
      {
        type: 'link',
        label: 'Configuration',
        route: () => this.layoutService.openConfigpanel(),
        icon: 'mat:settings'
      }
    ];
    const hiddenMenuLabels = new Set([
      'Apps',
      'Pages',
      'Documentation',
      'UI Elements'
    ]);
    const visibleItems = items.filter(
      (item) => !item.label || !hiddenMenuLabels.has(item.label)
    );
    if (academyId > 0 && this.authService.getCurrentUser()?.rol === 'academy_admin') {
      const academyMenu = visibleItems.find(item => item.label === 'Academia');
      if (academyMenu && 'children' in academyMenu) {
        academyMenu.children.push({
          type: 'link', label: 'Usuarios', route: academyRoute('users'), icon: 'mat:manage_accounts'
        });
      }
    }
    if (this.authService.getCurrentUser()?.rol === 'admin') {
      visibleItems.unshift({
        type: 'subheading', label: 'Administración', children: [
          { type: 'link', label: 'Usuarios', route: '/admin/users', icon: 'mat:manage_accounts' },
          { type: 'link', label: 'Estilos y federaciones', route: '/admin/styles-federations', icon: 'mat:account_tree' },
          { type: 'link', label: 'Gestión Alumnos', route: '/admin/students', icon: 'mat:school' },
          { type: 'link', label: 'Eventos', route: '/admin/events', icon: 'mat:event' },
          { type: 'link', label: 'Asociaciones deportivas', route: '/admin/event-associations', icon: 'mat:groups' }
        ]
      });
    }
    visibleItems.unshift({ type: 'link', label: 'Mi cuenta', route: '/mi-cuenta', icon: 'mat:person' });
    const base=this.filterAccess(visibleItems).map(item=>item);
    const removeGrading=(items:NavigationItem[]):NavigationItem[]=>items.flatMap<NavigationItem>(item=>{
      if('route' in item&&typeof item.route==='string'&&/\/notifications$/.test(item.route))return [];
      if ('children' in item && item.label==='Grados') return [{...item,label:'Estilos',children:item.children.filter(child=>child.label==='Estilos')} as NavigationItem];
      return 'children' in item ? [{...item,children:removeGrading(item.children)} as NavigationItem] : [item];
    });
    const filtered=removeGrading(base);this._items.next(this.translateItems(filtered));
    const session=this.authService.getCurrentUser();
    if(session)forkJoin({grading:this.grading.capabilities().pipe(catchError(()=>of({permissions:[] as string[],academyIds:[] as number[],studentIds:[] as number[],academies:[] as {id:number;name:string}[]}))),notifications:this.notificationService.capabilities().pipe(catchError(()=>of({permissions:[] as string[],academies:[] as {id:number;name:string}[]})))}).subscribe(({grading:c,notifications:n})=>{
      if(this.authService.getCurrentUser()!==session)return;
      const links:NavigationItem[]=[];
      if(c.permissions.includes('grading.student.view')||c.permissions.includes('grading.system.view')){
        if(!c.studentIds.length)for(const id of c.academyIds)links.push({type:'link',label:c.academyIds.length>1?`Grados / ${c.academies?.find(a=>a.id===id)?.name||'Academia'}`:'Grados / Progresión',route:`/academies/${id}/grading`,icon:'mat:military_tech'});
        if(c.studentIds.length)links.push({type:'link',label:'Mis grados / Representados',route:'/mi-cuenta/grading',icon:'mat:military_tech'});
      }
      if(n.permissions.some(p=>['notification.manage','notification.delivery.view','notification.rule.view','notification.template.view'].includes(p)))for(const a of n.academies)links.push({type:'link',label:n.academies.length>1?'Notificaciones / '+a.name:'Notificaciones',route:`/academies/${a.id}/notifications`,icon:'mat:notifications'});
      if(n.permissions.includes('notification.view')||n.permissions.includes('notification.preference.view'))links.push({type:'link',label:'Mis notificaciones',route:'/mi-cuenta/notifications',icon:'mat:notifications'});
      const output=[...filtered];const academy=output.find(i=>i.label==='Academia');
      if(academy&&'children' in academy)output[output.indexOf(academy)]={...academy,children:[...academy.children,...links]} as NavigationItem;
      else if(links.length)output.push({type:'subheading',label:'Academia',children:links} as NavigationItem);
      this._items.next(this.translateItems(output));
    });


  }

  private filterAccess(items: NavigationItem[]): NavigationItem[] {
    const session = this.authService.getCurrentUser();
    return items.flatMap<NavigationItem>(item => {
      if ('children' in item) {
        const children = this.filterAccess(item.children) as typeof item.children;
        return children.length ? [{ ...item, children }] : [];
      }
      return typeof item.route === 'string' && canAccessRoute(session, item.route) ? [item] : [];
    });
  }

  private translateItems(items: NavigationItem[]): NavigationItem[] {
    return items.map((item) => {
      const translated = {
        ...item,
        label: item.label
          ? this.languageService.translate(item.label)
          : item.label
      } as NavigationItem;

      if ('children' in item && item.children) {
        (translated as any).children = this.translateItems(item.children);
      }

      return translated;
    });
  }
}
