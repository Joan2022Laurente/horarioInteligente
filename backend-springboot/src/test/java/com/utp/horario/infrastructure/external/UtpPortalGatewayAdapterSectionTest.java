package com.utp.horario.infrastructure.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Parser del árbol canónico unities -> themes -> contents, sin red y sin datos de dominio fijos. */
class UtpPortalGatewayAdapterSectionTest {

    private static final String SECTION = "section-resuelta-del-horario";
    private static final String CODE = "100000SI97";
    private static final String NAME = "SERVICIOS CLOUD";

    private static final String PAYLOAD = """
            {
              "data": {
                "unities": [
                  {
                    "id": "unidad-1",
                    "themes": [
                      {
                        "id": "tema-1", "weekNumber": 3,
                        "contents": [
                          {"contentId":"cont-1","title":"Foro de debate","type":"FORUM",
                           "metadata":{"isQualified":true,"visibleTo":"2026-09-10T23:59:00"}},
                          {"contentId":"cont-2","title":"Material de lectura","type":"PAGE",
                           "metadata":{}}
                        ]
                      }
                    ]
                  },
                  {
                    "id": "unidad-2",
                    "themes": [
                      {
                        "id": "tema-2", "weekNumber": 15,
                        "contents": [
                          {"contentId":"cont-3","title":"PARTICIPACIÓN EN CLASE","type":"EVALUATION",
                           "evaluationSystem":"PA",
                           "metadata":{"isQualified":true,"visibleTo":"2026-11-10T23:59:00","studentStatus":"DELIVERED"}},
                          {"contentId":"cont-4","title":"Laboratorio VM","type":"HOMEWORK",
                           "metadata":{"isQualified":true,"visibleTo":"2026-11-12T23:59:00"}}
                        ]
                      }
                    ]
                  }
                ]
              }
            }
            """;

    @Test
    @DisplayName("Extrae solo entregables, preservando semana, rubro, fecha y estado reales")
    void extractsEvaluativeContentsWithFullMetadata() throws Exception {
        JsonNode data = new ObjectMapper().readTree(PAYLOAD).get("data");

        List<TaskSyncItem> items = UtpPortalGatewayAdapter.parseSectionTree(data, SECTION, CODE, NAME);

        assertEquals(3, items.size(), "El contenido PAGE no evaluativo debe descartarse");
        assertFalse(items.stream().anyMatch(i -> "cont-2".equals(i.getContentId())));

        TaskSyncItem forum = items.stream().filter(i -> "cont-1".equals(i.getContentId())).findFirst().orElseThrow();
        assertEquals(3, forum.getWeek());
        assertEquals("FORUM", forum.getType());
        assertEquals(Boolean.TRUE, forum.getIsQualified());
        assertEquals(LocalDateTime.of(2026, 9, 10, 23, 59), forum.getDueDate());

        TaskSyncItem participation = items.stream()
                .filter(i -> "cont-3".equals(i.getContentId())).findFirst().orElseThrow();
        assertEquals(15, participation.getWeek());
        assertEquals("PA", participation.getEvaluationSystem());
        assertEquals("DELIVERED", participation.getHomeworkStatus());
        assertEquals(Boolean.TRUE, participation.getIsDelivered());
        assertEquals(CODE, participation.getCourseCode());
        assertEquals(NAME, participation.getCourseName());
        assertEquals(SECTION, participation.getSectionId());

        TaskSyncItem lab = items.stream().filter(i -> "cont-4".equals(i.getContentId())).findFirst().orElseThrow();
        assertEquals(15, lab.getWeek());
        assertNotNull(lab.getDueDate());
        assertTrue(lab.getDueDate().isAfter(forum.getDueDate()));
    }
}
