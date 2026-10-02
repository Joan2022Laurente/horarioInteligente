package com.utp.horario.application.command;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@Builder
public class AuthenticateStudentCommand {
    private final String username;
    private final String password;
}
