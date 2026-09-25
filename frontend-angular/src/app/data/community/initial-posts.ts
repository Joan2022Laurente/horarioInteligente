import { CommunityPost } from '@domain/models/community';

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-101',
    author: {
      id: 'usr-1',
      student_code: 'U21304921',
      full_name: 'Valeria Mendoza',
      avatar_letter: 'V',
      career: 'Ingeniería de Sistemas e Informática',
      campus: 'Lima Centro',
      cycle: 6,
      reputation_score: 185
    },
    course_name: 'Desarrollo Web Integrado',
    category: 'ACADEMIC_QUESTION',
    title: 'Configuración de JWT en Spring Boot 3 y Angular sin romper endpoints públicos para APF1',
    content: 'Al implementar SecurityFilterChain en Spring Boot 3.3 con JWT, los endpoints de `/api/v1/public/**` siguen exigiendo token Bearer o responden 403 Forbidden. Comparto la captura de la arquitectura de filtros para revisión:',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    tags: ['SpringBoot', 'JWT', 'Security', 'Angular', 'APF1'],
    upvotes_count: 32,
    has_user_upvoted: false,
    has_user_bookmarked: true,
    comments_count: 2,
    solution_comment_id: 'comm-101-1',
    created_at: 'Hoy, 14:20',
    comments: [
      {
        id: 'comm-101-1',
        post_id: 'post-101',
        author: {
          id: 'usr-prof',
          student_code: 'U20109988',
          full_name: 'Carlos Benites (Tutor Par)',
          avatar_letter: 'C',
          career: 'Ingeniería de Sistemas e Informática'
        },
        content: 'En Spring Boot 3 debes usar `.requestMatchers("/api/v1/public/**").permitAll()` y asegurarte de anteponer el filtro JWT antes de `UsernamePasswordAuthenticationFilter.class` con `addFilterBefore(...)`. Además en CORS debes permitir `Origin: http://localhost:4200` y el header `Authorization`.',
        upvotes_count: 18,
        has_user_upvoted: true,
        is_verified_solution: true,
        created_at: 'Hoy, 14:45'
      },
      {
        id: 'comm-101-2',
        post_id: 'post-101',
        author: {
          id: 'usr-me',
          student_code: 'U20210001',
          full_name: 'Estudiante UTP',
          avatar_letter: 'J',
          career: 'Ingeniería de Sistemas e Informática'
        },
        content: 'Asegúrate también de que en `proxy.conf.json` de Angular tengas `changeOrigin: true` para que no pierda los headers en las redirecciones.',
        upvotes_count: 5,
        has_user_upvoted: false,
        is_verified_solution: false,
        created_at: 'Hoy, 15:10'
      }
    ]
  },
  {
    id: 'post-102',
    author: {
      id: 'usr-2',
      student_code: 'U20219842',
      full_name: 'Mateo Quispe Flores',
      avatar_letter: 'M',
      career: 'Ingeniería de Sistemas e Informática',
      campus: 'Lima Centro',
      cycle: 6,
      reputation_score: 140
    },
    category: 'POLL',
    title: 'Encuesta: ¿Qué proveedor Cloud prefieren para proyectos finales de ciclo?',
    content: 'Estamos debatiendo en clase qué proveedor ofrece mejor soporte para despliegues con créditos de estudiante (AWS Academy vs Azure for Students vs Google Cloud):',
    poll: {
      id: 'poll-102',
      question: 'Proveedor Cloud preferido para proyectos',
      total_votes: 68,
      user_voted_option_id: 'opt-1',
      options: [
        { id: 'opt-1', text: 'AWS (Amazon Web Services)', votes_count: 42 },
        { id: 'opt-2', text: 'Azure (Microsoft)', votes_count: 16 },
        { id: 'opt-3', text: 'GCP (Google Cloud)', votes_count: 10 }
      ]
    },
    tags: ['Cloud', 'AWS', 'Azure', 'Debate', 'Encuesta'],
    upvotes_count: 27,
    has_user_upvoted: true,
    has_user_bookmarked: false,
    comments_count: 3,
    solution_comment_id: null,
    created_at: 'Ayer, 19:10',
    comments: [
      {
        id: 'comm-102-1',
        post_id: 'post-102',
        author: {
          id: 'usr-4',
          student_code: 'U23109842',
          full_name: 'Sebastian Morales',
          avatar_letter: 'S',
          career: 'Ingeniería de Sistemas e Informática'
        },
        content: 'AWS por la facilidad de integración de VPC y EC2 en los laboratorios de Servicios Cloud con el profesor Orbegoso.',
        upvotes_count: 8,
        has_user_upvoted: false,
        is_verified_solution: false,
        created_at: 'Ayer, 20:00'
      }
    ]
  },
  {
    id: 'post-103',
    author: {
      id: 'usr-3',
      student_code: 'U22334455',
      full_name: 'Luciana Diaz',
      avatar_letter: 'L',
      career: 'Ingeniería de Sistemas e Informática',
      campus: 'Lima Centro',
      cycle: 6,
      reputation_score: 115
    },
    category: 'CAMPUS_LIFE',
    title: 'Nuevos espacios de estudio con tomas de corriente en Torre A (Piso 8 y 10)',
    content: 'Habilitaron nuevas mesas con tomas de corriente y conectividad rápida frente a los laboratorios de cómputo en Torre A. Excelente para quienes tenemos horas libres entre clases presenciales.',
    image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    tags: ['Campus', 'TorreA', 'EspaciosEstudio', 'LimaCentro'],
    upvotes_count: 41,
    has_user_upvoted: false,
    has_user_bookmarked: true,
    comments_count: 1,
    solution_comment_id: null,
    created_at: 'Hace 2 días',
    comments: [
      {
        id: 'comm-103-1',
        post_id: 'post-103',
        author: {
          id: 'usr-5',
          student_code: 'U23214589',
          full_name: 'Camila Rodriguez',
          avatar_letter: 'C',
          career: 'Ingeniería de Sistemas e Informática'
        },
        content: 'Confirmado, el internet en ese piso llega a 120 Mbps, ideal para probar despliegues de contenedores.',
        upvotes_count: 6,
        has_user_upvoted: false,
        is_verified_solution: false,
        created_at: 'Hace 2 días'
      }
    ]
  },
  {
    id: 'post-104',
    author: {
      id: 'usr-4',
      student_code: 'U23109842',
      full_name: 'Sebastian Morales Huaman',
      avatar_letter: 'S',
      career: 'Ingeniería de Sistemas e Informática',
      campus: 'Lima Centro',
      cycle: 6,
      reputation_score: 125
    },
    course_name: 'Servicios Cloud',
    category: 'PROJECT_RECRUITMENT',
    title: 'Convocatoria: 1 integrante para equipo de Servicios Cloud (AWS VPC + Terraform)',
    content: 'Somos 3 estudiantes de la sección de los viernes (Prof. Orbegoso). Tenemos diagramada la topología en Cloudcraft y estamos automatizando el despliegue con Terraform. Buscamos a alguien con interés en backend o bases de datos RDS para completar el grupo de 4.',
    tags: ['AWS', 'Terraform', 'VPC', 'Cloud', 'Squad'],
    upvotes_count: 19,
    has_user_upvoted: false,
    has_user_bookmarked: false,
    comments_count: 0,
    solution_comment_id: null,
    created_at: 'Hace 3 días',
    comments: []
  }
];
