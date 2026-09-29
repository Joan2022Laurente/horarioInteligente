package com.utp.horario.domain.port.out;

import com.utp.horario.domain.model.ScheduleInterval;
import com.utp.horario.domain.model.StudentProfile;
import com.utp.horario.domain.model.TaskSyncItem;
import com.utp.horario.domain.model.tool.AcademicToolDto.CourseSummaryDto;
import com.utp.horario.domain.model.tool.AcademicToolDto.UpcomingEvaluationDto;

import com.utp.horario.domain.model.Syllabus;

import java.util.List;

public interface UtpPortalGatewayPort {
    StudentProfile login(String username, String password);
    ScheduleInterval fetchSchedule(String token, String period);
    List<TaskSyncItem> fetchTasks(String token, String sectionId);
    Syllabus fetchSyllabus(String token, String courseCode, String sectionId, String pdfUrl);

    List<CourseSummaryDto> fetchCoursesSummary(String token);
    List<UpcomingEvaluationDto> fetchUpcomingEvaluations(String token, int limit);
    List<TaskSyncItem> fetchActivitiesByWeek(String token, Integer week);
    String fetchSyllabusMarkdown(String token, String courseCode);
    String exportCalendarIcs(String token, String period);

    void registerStudentToken(String studentCode, String token);
    String getStudentToken(String studentCode);
}
