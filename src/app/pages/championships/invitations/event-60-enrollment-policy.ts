export function event60SelectionError(eventId: number, team: boolean, selected: Set<number>, categories: any[]): string {
  if (eventId !== 60) return '';
  if (team) return selected.size > 1 ? 'El evento permite una sola categoría por equipo.' : '';
  const counts = { kata: 0, kumite: 0 };
  const visited = new Set<number>();
  const visit = (item: any, inherited = '') => {
    const label = String(item.modality ?? item.Modality ?? inherited).trim();
    const id = Number(item.id ?? item.Id);
    if (selected.has(id) && !visited.has(id)) {
      visited.add(id);
      if (/^kata(?:\s+individual.*)?$/i.test(label)) counts.kata++;
      if (/^kumite(?:\s+individual.*)?$/i.test(label)) counts.kumite++;
    }
    (item.children ?? item.Children ?? []).forEach((child: any) => visit(child, label));
  };
  categories.forEach(item => visit(item));
  if (counts.kata > 2) return 'El evento permite un máximo de 2 categorías de Kata individual por deportista.';
  if (counts.kumite > 2) return 'El evento permite un máximo de 2 categorías de Kumite individual por deportista.';
  return '';
}
