package com.utp.horario.domain.model.repositories;

import com.utp.horario.application.dtos.AcademicToolDto.CourseSummaryDto;
import com.utp.horario.application.dtos.AcademicToolDto.UpcomingEvaluationDto;
import com.utp.horario.domain.model.aggregate.StudentProfile;
import com.utp.horario.domain.model.aggregate.Syllabus;
import com.utp.horario.domain.model.aggregate.TaskSyncItem;
import com.utp.horario.domain.model.value_objets.ScheduleInterval;

import java.util.List;

public interface IUtpPortalGateway {
    StudentProfile login(String username, String password);
    ScheduleInterval fetchSchedule(String token, String period);
    List<TaskSyncItem> fetchTasks(String token, String sectionId);
    Syllabus fetchSyllabus(String token, String courseCode, String sectionId, String pdfUrl);

    List<CourseSummaryDto> fetchCoursesSummary(String token);
    List<UpcomingEvaluationDto> fetchUpcomingEvaluations(String token, int limit);
    List<TaskSyncItem> fetchActivitiesByWeek(String token, Integer week);
    List<TaskSyncItem> fetchActivities(String token, String intervalMode, Integer week, String status, Boolean onlyGraded, String type);
    com.fasterxml.jackson.databind.JsonNode fetchTaskDetail(String token, String sectionId, String activityId);
    String fetchSyllabusMarkdown(String token, String courseCode);
    String exportCalendarIcs(String token, String period);

    void registerStudentToken(String studentCode, String token);
    String getStudentToken(String studentCode);
}
