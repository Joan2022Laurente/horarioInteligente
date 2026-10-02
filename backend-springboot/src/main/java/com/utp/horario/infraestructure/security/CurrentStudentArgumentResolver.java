package com.utp.horario.infraestructure.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Resuelve y valida la identidad del estudiante en los parÃ¡metros anotados con @CurrentStudent
 * a partir de la cabecera Authorization (JWT Bearer) o parÃ¡metro legÃ­timo.
 */
@Component
@RequiredArgsConstructor
public class CurrentStudentArgumentResolver implements HandlerMethodArgumentResolver {

    private final SecurityIdentityResolver identityResolver;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentStudent.class)
                && parameter.getParameterType().equals(String.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        String authHeader = webRequest.getHeader("Authorization");
        String paramStudentId = webRequest.getParameter("studentId");
        CurrentStudent annotation = parameter.getParameterAnnotation(CurrentStudent.class);
        boolean required = annotation == null || annotation.required();

        String resolved = null;
        try {
            resolved = identityResolver.resolveStudentCode(authHeader, paramStudentId);
        } catch (Exception e) {
            if (required) {
                throw new SecurityException("Acceso no autorizado: Se requiere un token de sesiÃ³n o un cÃ³digo de estudiante legÃ­timo.");
            }
        }

        if (required && (resolved == null || resolved.isBlank())) {
            throw new SecurityException("Acceso no autorizado: Se requiere un token de sesiÃ³n o un cÃ³digo de estudiante legÃ­timo.");
        }

        return resolved;
    }
}

