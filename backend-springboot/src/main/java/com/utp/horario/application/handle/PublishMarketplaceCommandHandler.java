package com.utp.horario.application.handle;

import com.utp.horario.application.assembler.MarketplaceAssembler;
import com.utp.horario.application.command.PublishMarketplaceCommand;
import com.utp.horario.application.dtos.MarketplaceDto;
import com.utp.horario.domain.model.aggregate.MarketplaceItem;
import com.utp.horario.domain.model.repositories.IMarketplaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

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

    public List<MarketplaceDto> search(String q, String type, String category, String status, String course) {
        String cleanQ = (q != null) ? q.trim().toLowerCase() : null;
        String cleanType = (type != null && !type.isBlank() && !type.equalsIgnoreCase("ALL")) ? type.trim().toUpperCase() : null;
        String cleanCategory = (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) ? category.trim().toUpperCase() : null;
        String cleanStatus = (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) ? status.trim().toUpperCase() : null;
        String cleanCourse = (course != null && !course.isBlank() && !course.equalsIgnoreCase("ALL")) ? course.trim().toLowerCase() : null;

        return repository.list().stream()
                .filter(item -> {
                    if (cleanType != null && (item.getItemType() == null || !item.getItemType().equalsIgnoreCase(cleanType))) {
                        return false;
                    }
                    if (cleanCategory != null && (item.getCategory() == null || !item.getCategory().equalsIgnoreCase(cleanCategory))) {
                        return false;
                    }
                    if (cleanStatus != null) {
                        String st = (item.getStatus() != null) ? item.getStatus().toUpperCase() : "AVAILABLE";
                        if (!st.equals(cleanStatus)) return false;
                    }
                    if (cleanCourse != null) {
                        String title = (item.getTitle() != null) ? item.getTitle().toLowerCase() : "";
                        String desc = (item.getDescription() != null) ? item.getDescription().toLowerCase() : "";
                        if (!title.contains(cleanCourse) && !desc.contains(cleanCourse)) {
                            return false;
                        }
                    }
                    if (cleanQ != null && !cleanQ.isEmpty()) {
                        String title = (item.getTitle() != null) ? item.getTitle().toLowerCase() : "";
                        String desc = (item.getDescription() != null) ? item.getDescription().toLowerCase() : "";
                        String tutor = (item.getTutorName() != null) ? item.getTutorName().toLowerCase() : "";
                        String loc = (item.getLocation() != null) ? item.getLocation().toLowerCase() : "";
                        return title.contains(cleanQ) || desc.contains(cleanQ) || tutor.contains(cleanQ) || loc.contains(cleanQ);
                    }
                    return true;
                })
                .map(assembler::toDto)
                .toList();
    }

    public List<MarketplaceDto> findByStudentCode(String studentCode) {
        if (studentCode == null || studentCode.isBlank()) {
            return List.of();
        }
        String clean = studentCode.trim().toLowerCase();
        return repository.list().stream()
                .filter(item -> {
                    String tutor = (item.getTutorName() != null) ? item.getTutorName().toLowerCase() : "";
                    String contact = (item.getContactMethod() != null) ? item.getContactMethod().toLowerCase() : "";
                    return tutor.contains(clean) || contact.contains(clean);
                })
                .map(assembler::toDto)
                .toList();
    }

    public Optional<MarketplaceDto> updateStatus(String id, String newStatus, String studentCode) {
        Optional<MarketplaceItem> opt = repository.findById(id);
        if (opt.isEmpty()) return Optional.empty();

        MarketplaceItem item = opt.get();
        if (studentCode != null && !studentCode.isBlank()) {
            String tutor = (item.getTutorName() != null) ? item.getTutorName().toLowerCase() : "";
            String contact = (item.getContactMethod() != null) ? item.getContactMethod().toLowerCase() : "";
            String clean = studentCode.trim().toLowerCase();
            if (!tutor.contains(clean) && !contact.contains(clean)) {
                throw new IllegalStateException("Solo el estudiante propietario puede cambiar el estado de la publicación.");
            }
        }
        item.changeStatus(newStatus);
        MarketplaceItem updated = repository.save(item);
        return Optional.of(assembler.toDto(updated));
    }

    public Optional<MarketplaceDto> findById(String id) {
        return repository.findById(id).map(assembler::toDto);
    }

    public List<MarketplaceDto> findByCategory(String category) {
        return repository.findByCategory(category).stream().map(assembler::toDto).toList();
    }

    public List<MarketplaceDto> findByCourseCode(String courseCode) {
        return repository.findByCourseCode(courseCode).stream().map(assembler::toDto).toList();
    }

    public boolean delete(String id) {
        return repository.delete(id);
    }
}
