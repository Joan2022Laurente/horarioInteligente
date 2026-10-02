package com.utp.horario.application.command;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Builder
public class GenerateScheduleCommand {
    private final String studentId;
    private final String period;
    private final String token;
}
