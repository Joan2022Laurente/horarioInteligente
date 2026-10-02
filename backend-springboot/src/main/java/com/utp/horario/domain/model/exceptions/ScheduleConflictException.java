package com.utp.horario.domain.model.exceptions;

public class ScheduleConflictException extends BusinessException {
    public ScheduleConflictException(String message) {
        super(message);
    }
}
