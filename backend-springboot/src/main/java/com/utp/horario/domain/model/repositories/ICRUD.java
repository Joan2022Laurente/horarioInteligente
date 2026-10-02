package com.utp.horario.domain.model.repositories;

import java.util.List;
import java.util.Optional;

public interface ICRUD<T, ID> {
    T save(T t);
    Optional<T> findById(ID id);
    T update(T t);
    List<T> list();
    Boolean delete(ID id);
}
