import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export interface AppLanguage {
  locale: 'es-CL' | 'pt-BR';
  label: string;
  flag: string;
}

type TranslationTree = { [key: string]: string | TranslationTree };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages: AppLanguage[] = [
    { locale: 'es-CL', label: 'Español (Chile)', flag: 'flag:chile' },
    { locale: 'pt-BR', label: 'Português (Brasil)', flag: 'flag:brazil' }
  ];

  private translations: TranslationTree = {};
  private loadSequence = 0;
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.savedLanguage());
  readonly language$ = this.languageSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get current(): AppLanguage {
    return this.languageSubject.value;
  }

  async initialize(): Promise<void> {
    await this.use(this.current);
  }

  async use(language: AppLanguage): Promise<void> {
    const sequence = ++this.loadSequence;
    const translations = await this.fetch(language);
    if (sequence !== this.loadSequence) return;
    this.translations = translations;
    localStorage.setItem('bte-language', language.locale);
    document.documentElement.lang = language.locale;
    this.languageSubject.next(language);
  }

  translate(key: string): string {
    const value = key.split('.').reduce<string | TranslationTree | undefined>(
      (node, segment) => typeof node === 'object' ? node[segment] : undefined,
      this.translations
    );
    if (typeof value === 'string') return value;
    const literals = this.translations['literal'];
    const literal = typeof literals === 'object' ? literals[key] : undefined;
    return typeof literal === 'string' ? literal : key;
  }

  private fetch(language: AppLanguage): Promise<TranslationTree> {
    return firstValueFrom(
      this.http.get<TranslationTree>(`assets/i18n/${language.locale}.json`)
    );
  }

  private savedLanguage(): AppLanguage {
    const locale = localStorage.getItem('bte-language');
    const saved = this.languages.find((language) => language.locale === locale);
    if (saved) return saved;

    const browserLocales = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    const prefersPortuguese = browserLocales.some(
      (browserLocale) =>
        browserLocale.toLowerCase().startsWith('pt') ||
        browserLocale.toLowerCase().endsWith('-br')
    );

    return prefersPortuguese ? this.languages[1] : this.languages[0];
  }
}
