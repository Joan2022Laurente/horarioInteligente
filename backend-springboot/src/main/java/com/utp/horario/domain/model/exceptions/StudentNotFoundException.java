package com.utp.horario.domain.model.exceptions;

public class StudentNotFoundException extends BusinessException {
    public StudentNotFoundException(String message) {
        super(message);
    }
}
