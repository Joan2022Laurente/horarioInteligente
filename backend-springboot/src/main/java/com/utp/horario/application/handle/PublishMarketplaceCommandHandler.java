package com.utp.horario.application.handle;

import com.utp.horario.application.assembler.MarketplaceAssembler;
import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.domain.model.aggregate.MarketplaceItem;
import com.utp.horario.domain.model.repositories.IMarketplaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PublishMarketplaceCommandHandler {

    private final IMarketplaceRepository repository;
    private final MarketplaceAssembler assembler;

    public MarketplaceDto handle(PublishMarketplaceCommand command) {
        MarketplaceItem item = assembler.toDomain(command);
        MarketplaceItem saved = repository.save(item);
        return assembler.toDto(saved);
    }

    public List<MarketplaceDto> listAll() {
        return repository.list().stream().map(assembler::toDto).toList();
    }

    public List<MarketplaceDto> findByCategory(String category) {
        return repository.findByCategory(category).stream().map(assembler::toDto).toList();
    }

    public List<MarketplaceDto> findByCourseCode(String courseCode) {
        return repository.findByCourseCode(courseCode).stream().map(assembler::toDto).toList();
    }
}
