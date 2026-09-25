import { UTPEvent } from '@domain/models/utp.model';

export interface ClassroomLocation {
  campus: string;
  pabellon: string;
  piso: number | string;
  aula: string;
  tipo: string;
  docente?: string;
}

/**
 * Resuelve la ubicación real (Aula, Pabellón/Sede, Piso, Ambiente, Docente)
 * extrayendo prioritariamente los metadatos reales del Portal UTP GraphQL.
 */
export function resolveEventLocation(ev: UTPEvent, studentCampus?: string): ClassroomLocation {
  if (ev?.metadata?.classroom && ev.metadata.classroom.trim() !== '') {
    const rawFloor = ev.metadata.floor || '';
    const numericFloor = parseInt(rawFloor.replace(/\D/g, ''), 10);
    const parsedFloor = !isNaN(numericFloor) && numericFloor > 0 ? numericFloor : (rawFloor || '1');
    const aulaStr = ev.metadata.classroom.startsWith('Aula') ? ev.metadata.classroom : `Aula ${ev.metadata.classroom}`;
    
    return {
      campus: studentCampus || ev.metadata.building || 'Campus UTP',
      pabellon: ev.metadata.building || studentCampus || 'Pabellón UTP',
      piso: parsedFloor,
      aula: aulaStr,
      tipo: ev.metadata.environmentType || (ev.modality === 'P' ? 'AULA TEÓRICA' : 'AULA VIRTUAL'),
      docente: ev.metadata.teacher || ''
    };
  }

  // Fallback determinista en caso no existan metadatos
  const title = ev?.title || '';
  const cleanTitle = title.replace(/\(\d+\)/g, '').replace(/-\s*Semana\s*\d+/gi, '').trim();
  const sectionCode = ev?.metadata?.sectionId || ev?.metadata?.sectionCode || '';
  return getClassroomLocation(cleanTitle, sectionCode, studentCampus);
}

/**
 * Genera la información de ubicación física estructurada en caso de fallback cuando no hay metadatos
 */
export function getClassroomLocation(courseName: string, sectionCode?: string, studentCampus?: string): ClassroomLocation {
  const isLab = courseName.toUpperCase().includes('WEB') || 
                courseName.toUpperCase().includes('CLOUD') || 
                courseName.toUpperCase().includes('PROGRAMACI') ||
                courseName.toUpperCase().includes('SISTEMAS') ||
                courseName.toUpperCase().includes('LAB');

  return {
    campus: studentCampus || '',
    pabellon: studentCampus ? `Pabellón (${studentCampus})` : '',
    piso: '',
    aula: isLab ? 'Laboratorio' : 'Aula',
    tipo: isLab ? 'LABORATORIO DE CÓMPUTO - PC' : 'AULA TEÓRICA',
  };
}
