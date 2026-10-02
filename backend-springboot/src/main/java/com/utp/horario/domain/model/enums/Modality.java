package com.utp.horario.domain.model.enums;

public enum Modality {
    PRESENCIAL("P"),
    REMOTO("R"),
    VIRTUAL("V");

    private final String code;

    Modality(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
