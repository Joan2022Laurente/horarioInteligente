package com.utp.horario.application.command;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Builder
public class SyncTaskCommand {
    private final String studentId;
    private final String token;
    private final String sectionId;
}
